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
        total_segs = len(segments)

        for idx, seg in enumerate(segments):
            road_type = seg.get("road_type", "Local")
            speed_kmh = seg.get("speed_kmh")
            
            if speed_kmh is None or speed_kmh <= 0:
                speed_kmh, speed_src = derive_segment_speed_and_source(road_type)
            else:
                speed_src = seg.get("speed_source", "DERIVED")

            loc_traffic = traffic_override

            # Apply realistic spatial position speed & traffic variation along the route
            if total_segs > 2:
                if idx == 0 or idx == total_segs - 1:
                    # Terminal local access legs (origin departure & destination arrival)
                    speed_kmh = 20.0
                    loc_traffic = "Low"
                    road_type = "Local"
                elif 0.15 <= (idx / total_segs) <= 0.85:
                    # Mid-route primary corridor segments
                    if road_type == "Local" and seg.get("distance_m", 0) > 600:
                        road_type = "Arterial"
                        speed_kmh = 55.0
                    elif road_type == "Highway":
                        speed_kmh = round(max(speed_kmh, 85.0), 1)
                        loc_traffic = "High" if traffic_override in ["High", "Jammed"] else "Medium"
                    elif road_type == "Expressway":
                        speed_kmh = round(max(speed_kmh, 110.0), 1)
                        loc_traffic = "High" if traffic_override in ["High", "Jammed"] else "Medium"

                    if idx % 5 == 0 and road_type in ["Highway", "Arterial"]:
                        # Major urban bottleneck / high-hazard intersection segment
                        loc_traffic = "Jammed"

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
                "traffic_density": loc_traffic,

                # Feature vectors prepared for ML prediction engine
                "ml_features": {
                    "weather": weather_override,
                    "traffic_density": loc_traffic,
                    "road_type": road_type,
                    "average_speed": float(speed_kmh),
                    "time_of_day": time_of_day_override,
                    "latitude": seg["centroid_latitude"],
                    "longitude": seg["centroid_longitude"],
                },
            })

        return enriched


feature_enrichment_service = FeatureEnrichmentService()
