from typing import Any
import time
from datetime import datetime
import pandas as pd
from sqlalchemy.ext.asyncio import AsyncSession


from app.logging_config import logger
from app.repositories.prediction import prediction_repo
from app.schemas.prediction import (
    PredictionRequest,
    PredictionResponse,
    BatchPredictionRequest,
    BatchPredictionResponse,
    BatchSegmentResponse,
)
from ml.model_manager import model_manager


class PredictionService:
    async def predict_risk(
        self,
        db: AsyncSession,
        payload: PredictionRequest,
        user_id: Any,
        request_id: str | None = None,
    ) -> PredictionResponse:
        """Executes the online inference pipeline for a single point.

        - Performs preprocessing using serialized transformers.
        - Calculates risk score and confidence.
        - Preserves audit/logs history database transaction.
        """
        start_time = time.time()
        
        # Load artifacts (will fail fast if not present)
        model = model_manager.get_model()
        preprocessor = model_manager.get_preprocessor()
        metadata = model_manager.get_metadata()
        model_version = metadata.get("model_version", "unknown")

        # 1. Align features in Pandas DataFrame matching model training shapes
        input_data = pd.DataFrame(
            [
                {
                    "weather": payload.weather,
                    "traffic_density": payload.traffic_density,
                    "road_type": payload.road_type,
                    "average_speed": payload.average_speed,
                    "time_of_day": payload.time_of_day,
                }
            ]
        )

        # 2. Execute Preprocessing
        preprocess_start = time.time()
        processed_features = preprocessor.transform(input_data)
        preprocess_latency = time.time() - preprocess_start

        # 3. Execute Model Inference
        inference_start = time.time()
        probabilities = model.predict_proba(processed_features)[0] # [Prob(Safe), Prob(Accident)]
        inference_latency = time.time() - inference_start

        # Calculate outputs
        accident_probability = float(probabilities[1])
        risk_score = int(round(accident_probability * 100))
        
        # Confidence score derived directly from predict_proba (the probability of the predicted class)
        predicted_class = 1 if accident_probability >= 0.5 else 0
        confidence_score = float(probabilities[predicted_class])

        # Resolve Risk Category (Calibrated Model Thresholds)
        if risk_score <= 30:
            risk_category = "Low"
        elif risk_score <= 45:
            risk_category = "Medium"
        elif risk_score <= 58:
            risk_category = "High"
        else:
            risk_category = "Critical"

        # 4. Persist prediction log history in DB
        db_payload = {
            "user_id": user_id,
            "weather": payload.weather,
            "traffic_density": payload.traffic_density,
            "road_type": payload.road_type,
            "average_speed": payload.average_speed,
            "time_of_day": payload.time_of_day,
            "risk_score": risk_score,
            "risk_category": risk_category,
            "accident_probability": confidence_score,  # save confidence
            "latitude": payload.latitude,
            "longitude": payload.longitude,
            "location_name": payload.location_name,
            "city": payload.city,
            "state": payload.state,
        }
        log_obj = await prediction_repo.create(db, obj_in=db_payload)

        # Latency calculations
        total_latency = time.time() - start_time
        
        logger.info(
            f"Prediction Execution: ID={request_id} ModelVer={model_version} "
            f"PreprocessTime={preprocess_latency:.4f}s InferenceTime={inference_latency:.4f}s "
            f"TotalTime={total_latency:.4f}s RiskScore={risk_score} RiskCat={risk_category}"
        )

        return PredictionResponse(
            prediction_id=log_obj.id,
            risk_score=risk_score,
            confidence_score=confidence_score,
            risk_category=risk_category,
            model_version=model_version,
            prediction_timestamp=log_obj.created_at,
            latitude=log_obj.latitude,
            longitude=log_obj.longitude,
            location_name=log_obj.location_name,
            city=log_obj.city,
            state=log_obj.state,
        )

    async def predict_batch_risk(
        self,
        db: AsyncSession,
        payload: BatchPredictionRequest,
        user_id: Any,
        request_id: str | None = None,
    ) -> BatchPredictionResponse:
        """Executes vectorized batch risk assessment across N route segments in a single pass."""
        start_time = time.time()

        model = model_manager.get_model()
        preprocessor = model_manager.get_preprocessor()
        metadata = model_manager.get_metadata()
        model_version = metadata.get("model_version", "unknown")

        total_segments = len(payload.segments)

        # 1. Build N-row Pandas DataFrame for SIMD preprocessing
        input_rows = [
            {
                "weather": seg.weather,
                "traffic_density": seg.traffic_density,
                "road_type": seg.road_type,
                "average_speed": seg.average_speed,
                "time_of_day": seg.time_of_day,
            }
            for seg in payload.segments
        ]
        input_data = pd.DataFrame(input_rows)

        # 2. Preprocess all N segments in one pass
        preprocess_start = time.time()
        processed_features = preprocessor.transform(input_data)
        preprocess_latency = time.time() - preprocess_start

        # 3. Model Vectorized Matrix Inference
        inference_start = time.time()
        probabilities_matrix = model.predict_proba(processed_features)  # Array of shape (N, 2)
        inference_latency = time.time() - inference_start

        predictions: list[BatchSegmentResponse] = []
        high_risk_count = 0
        critical_risk_count = 0
        total_risk_score_sum = 0

        for i, seg in enumerate(payload.segments):
            probs = probabilities_matrix[i]
            accident_prob = float(probs[1])
            risk_score = int(round(accident_prob * 100))

            predicted_class = 1 if accident_prob >= 0.5 else 0
            confidence_score = float(probs[predicted_class])

            if risk_score <= 30:
                risk_category = "Low"
            elif risk_score <= 45:
                risk_category = "Medium"
            elif risk_score <= 58:
                risk_category = "High"
                high_risk_count += 1
            else:
                risk_category = "Critical"
                critical_risk_count += 1

            total_risk_score_sum += risk_score

            predictions.append(
                BatchSegmentResponse(
                    segment_id=seg.segment_id,
                    risk_score=risk_score,
                    confidence_score=confidence_score,
                    risk_category=risk_category,
                    latitude=seg.latitude,
                    longitude=seg.longitude,
                    location_name=seg.location_name,
                    city=seg.city,
                    state=seg.state,
                )
            )

        avg_risk_score = int(round(total_risk_score_sum / total_segments)) if total_segments > 0 else 0

        if avg_risk_score <= 30:
            overall_category = "Low"
        elif avg_risk_score <= 45:
            overall_category = "Medium"
        elif avg_risk_score <= 58:
            overall_category = "High"
        else:
            overall_category = "Critical"

        # 4. Optional log entry for primary centroid segment to maintain audit history
        if payload.segments:
            first_seg = payload.segments[0]
            db_payload = {
                "user_id": user_id,
                "weather": first_seg.weather,
                "traffic_density": first_seg.traffic_density,
                "road_type": first_seg.road_type,
                "average_speed": first_seg.average_speed,
                "time_of_day": first_seg.time_of_day,
                "risk_score": avg_risk_score,
                "risk_category": overall_category,
                "accident_probability": predictions[0].confidence_score,
                "latitude": first_seg.latitude,
                "longitude": first_seg.longitude,
                "location_name": f"Batch Route ({total_segments} Segments)",
                "city": first_seg.city,
                "state": first_seg.state,
            }
            await prediction_repo.create(db, obj_in=db_payload)

        total_latency = time.time() - start_time

        logger.info(
            f"Batch Prediction Execution: ID={request_id} Segments={total_segments} ModelVer={model_version} "
            f"PreprocessTime={preprocess_latency:.4f}s InferenceTime={inference_latency:.4f}s "
            f"TotalTime={total_latency:.4f}s AvgRisk={avg_risk_score} OverallCat={overall_category}"
        )

        return BatchPredictionResponse(
            success=True,
            request_id=request_id,
            model_version=model_version,
            prediction_timestamp=datetime.utcnow(),
            total_segments=total_segments,
            distance_weighted_risk_score=avg_risk_score,
            overall_risk_category=overall_category,
            high_risk_segment_count=high_risk_count,
            critical_segment_count=critical_risk_count,
            predictions=predictions,
        )


prediction_service = PredictionService()
