from typing import List, Dict, Any
from app.services.road_taxonomy import derive_segment_speed_and_source


class FeatureEnrichmentService:
    """Prepares enriched route segment feature representations for SafeRoute AI.

    Prepares 5 ML-compatible features (weather, traffic_density, road_type, average_speed, time_of_day)
    and location attributes WITHOUT executing ML predictions.
    """

    def enrich_route_segments(
        self,
        segments: List[Dict[str, Any]],
        weather_override: str = "Clear",
        traffic_override: str = "Low",
        time_of_day_override: str = "Afternoon",
    ) -> List[Dict[str, Any]]:
        """Enriches raw segmented route objects with environmental parameters and ML feature metadata."""
        enriched: List[Dict[str, Any]] = []

        for seg in segments:
            road_type = seg.get("road_type", "Local")
            speed_kmh = seg.get("speed_kmh")
            
            if speed_kmh is None or speed_kmh <= 0:
                speed_kmh, speed_src = derive_segment_speed_and_source(road_type)
            else:
                speed_src = seg.get("speed_source", "DERIVED")

            enriched.append({
                "segment_id": seg["segment_id"],
                "sequence_index": seg["sequence_index"],
                "road_name": seg.get("road_name", "Road Segment"),
                "road_type": road_type,
                "distance_m": seg["distance_m"],
                "duration_s": seg["duration_s"],
                "centroid_latitude": seg["centroid_latitude"],
                "centroid_longitude": seg["centroid_longitude"],
                "geometry": seg["geometry"],
                "speed_kmh": speed_kmh,
                "speed_source": speed_src,

                # Feature vectors prepared for future ML prediction engine
                "ml_features": {
                    "weather": weather_override,
                    "traffic_density": traffic_override,
                    "road_type": road_type,
                    "average_speed": float(speed_kmh),
                    "time_of_day": time_of_day_override,
                    "latitude": seg["centroid_latitude"],
                    "longitude": seg["centroid_longitude"],
                },
            })

        return enriched


feature_enrichment_service = FeatureEnrichmentService()
