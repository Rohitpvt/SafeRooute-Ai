import math
from typing import List, Dict, Any
from app.services.routing_service import haversine_distance_meters
from app.services.road_taxonomy import derive_segment_speed_and_source, LOCAL

MAX_SEGMENT_LENGTH_METERS = 1000.0
MIN_SEGMENT_LENGTH_METERS = 200.0


def calculate_coordinates_centroid(coordinates: List[List[float]]) -> Dict[str, float]:
    """Calculates geometric centroid (mean latitude and longitude) for a list of [lng, lat] coordinate pairs."""
    if not coordinates:
        return {"latitude": 0.0, "longitude": 0.0}

    sum_lat = sum(coord[1] for coord in coordinates)
    sum_lng = sum(coord[0] for coord in coordinates)
    count = len(coordinates)

    return {
        "latitude": round(sum_lat / count, 6),
        "longitude": round(sum_lng / count, 6),
    }


def calculate_linestring_length_meters(coordinates: List[List[float]]) -> float:
    """Calculates total polyline path length in meters across an array of [lng, lat] coordinates."""
    if len(coordinates) < 2:
        return 0.0

    total_len = 0.0
    for i in range(len(coordinates) - 1):
        p1 = coordinates[i]
        p2 = coordinates[i + 1]
        total_len += haversine_distance_meters(p1[1], p1[0], p2[1], p2[0])

    return total_len


class RouteSegmentationEngine:
    """Authoritative Hybrid Segmentation Engine for SafeRoute AI polylines."""

    def segment_route(
        self,
        route_geometry: Dict[str, Any],
        steps: List[Dict[str, Any]],
        total_distance_m: float,
        total_duration_s: float,
    ) -> List[Dict[str, Any]]:
        """Partitions a full route polyline into discrete, enriched route segments using the approved hybrid strategy:

        - Splits on road_type changes.
        - Splits when cumulative segment distance reaches 1,000m limit.
        - Preserves minimum 200m floor by merging remainder fragments into preceding segments.
        - Preserves 100% of polyline vertices (zero geometry truncation).
        """
        all_coords = route_geometry.get("coordinates", [])

        # Edge Case 1: Route with fewer than 2 points
        if len(all_coords) < 2:
            centroid = calculate_coordinates_centroid(all_coords)
            return [
                {
                    "segment_id": "seg_000",
                    "sequence_index": 0,
                    "road_name": "Route Centroid",
                    "road_type": LOCAL,
                    "distance_m": total_distance_m,
                    "duration_s": total_duration_s,
                    "centroid_latitude": centroid["latitude"],
                    "centroid_longitude": centroid["longitude"],
                    "geometry": route_geometry,
                    "source_step_ids": ["step_000"] if steps else [],
                    "speed_kmh": 25.0,
                    "speed_source": "DEFAULT_TAXONOMY_PROFILE",
                }
            ]

        # Edge Case 2: Very short route (< 200m)
        actual_distance = total_distance_m if total_distance_m > 0 else calculate_linestring_length_meters(all_coords)
        if actual_distance < MIN_SEGMENT_LENGTH_METERS:
            centroid = calculate_coordinates_centroid(all_coords)
            first_step = steps[0] if steps else {}
            road_name = first_step.get("road_name", "Short Route Segment")
            road_type = first_step.get("road_type", LOCAL)
            speed_kmh, speed_src = derive_segment_speed_and_source(road_type, first_step.get("speed_kmh"))

            return [
                {
                    "segment_id": "seg_000",
                    "sequence_index": 0,
                    "road_name": road_name,
                    "road_type": road_type,
                    "distance_m": round(actual_distance, 1),
                    "duration_s": round(total_duration_s, 1),
                    "centroid_latitude": centroid["latitude"],
                    "centroid_longitude": centroid["longitude"],
                    "geometry": {"type": "LineString", "coordinates": all_coords},
                    "source_step_ids": [s["step_id"] for s in steps] if steps else ["step_000"],
                    "speed_kmh": speed_kmh,
                    "speed_source": speed_src,
                }
            ]

        # Hybrid Segmentation Pipeline: Use step geometries if available, or track step cumulative distance bounds
        raw_segments: List[Dict[str, Any]] = []

        if steps and any("geometry" in s and s["geometry"] and "coordinates" in s["geometry"] for s in steps):
            # Step-based partitioning using exact maneuver leg geometries
            for s_idx, step_obj in enumerate(steps):
                geom = step_obj.get("geometry", {})
                s_coords = geom.get("coordinates", []) if isinstance(geom, dict) else []
                if not s_coords or len(s_coords) < 2:
                    continue

                s_dist = calculate_linestring_length_meters(s_coords)
                s_name = step_obj.get("road_name", "Road Segment")
                s_type = step_obj.get("road_type", LOCAL)
                s_speed = step_obj.get("speed_kmh")
                s_id = step_obj.get("step_id", f"step_{s_idx:03d}")

                # Split long steps exceeding 1000m
                if s_dist > MAX_SEGMENT_LENGTH_METERS:
                    chunk_coords = [s_coords[0]]
                    chunk_dist = 0.0
                    for k in range(len(s_coords) - 1):
                        p1 = s_coords[k]
                        p2 = s_coords[k + 1]
                        d = haversine_distance_meters(p1[1], p1[0], p2[1], p2[0])
                        if (chunk_dist + d) >= MAX_SEGMENT_LENGTH_METERS and len(chunk_coords) >= 2:
                            raw_segments.append({
                                "coords": chunk_coords,
                                "distance_m": chunk_dist,
                                "road_name": s_name,
                                "road_type": s_type,
                                "speed_kmh": s_speed,
                                "step_ids": [s_id],
                            })
                            chunk_coords = [p1]
                            chunk_dist = 0.0
                        chunk_coords.append(p2)
                        chunk_dist += d
                    if len(chunk_coords) >= 2:
                        raw_segments.append({
                            "coords": chunk_coords,
                            "distance_m": chunk_dist,
                            "road_name": s_name,
                            "road_type": s_type,
                            "speed_kmh": s_speed,
                            "step_ids": [s_id],
                        })
                else:
                    raw_segments.append({
                        "coords": s_coords,
                        "distance_m": s_dist if s_dist > 0 else step_obj.get("distance_m", 0.0),
                        "road_name": s_name,
                        "road_type": s_type,
                        "speed_kmh": s_speed,
                        "step_ids": [s_id],
                    })
        else:
            # Polyline distance-based partitioning with step cursor progression
            current_segment_coords = [all_coords[0]]
            current_distance = 0.0
            step_cursor = 0
            current_step = steps[0] if steps else {}
            current_road_type = current_step.get("road_type", LOCAL)
            current_road_name = current_step.get("road_name", "Road Segment")
            current_speed = current_step.get("speed_kmh")
            current_step_ids = [current_step.get("step_id", "step_000")]

            step_cum_dist = 0.0
            step_target_dist = current_step.get("distance_m", 999999.0)

            for i in range(len(all_coords) - 1):
                p1 = all_coords[i]
                p2 = all_coords[i + 1]
                dist_step = haversine_distance_meters(p1[1], p1[0], p2[1], p2[0])
                step_cum_dist += dist_step

                # Check if we passed current maneuver step boundary
                if steps and step_cursor < len(steps) - 1 and step_cum_dist >= step_target_dist:
                    step_cursor += 1
                    current_step = steps[step_cursor]
                    step_cum_dist = 0.0
                    step_target_dist = current_step.get("distance_m", 999999.0)

                new_type = current_step.get("road_type", LOCAL)
                new_name = current_step.get("road_name", "Road Segment")
                new_speed = current_step.get("speed_kmh")
                new_id = current_step.get("step_id", "step_000")

                is_road_transition = (new_type != current_road_type) and (current_distance >= MIN_SEGMENT_LENGTH_METERS)
                is_distance_limit = (current_distance + dist_step) >= MAX_SEGMENT_LENGTH_METERS

                if (is_road_transition or is_distance_limit) and len(current_segment_coords) >= 2:
                    raw_segments.append({
                        "coords": current_segment_coords,
                        "distance_m": current_distance,
                        "road_name": current_road_name,
                        "road_type": current_road_type,
                        "speed_kmh": current_speed,
                        "step_ids": list(set(current_step_ids)),
                    })
                    current_segment_coords = [p1]
                    current_distance = 0.0
                    current_road_type = new_type
                    current_road_name = new_name
                    current_speed = new_speed
                    current_step_ids = [new_id]

                current_segment_coords.append(p2)
                current_distance += dist_step
                if new_id not in current_step_ids:
                    current_step_ids.append(new_id)

            if len(current_segment_coords) >= 2:
                raw_segments.append({
                    "coords": current_segment_coords,
                    "distance_m": current_distance,
                    "road_name": current_road_name,
                    "road_type": current_road_type,
                    "speed_kmh": current_speed,
                    "step_ids": list(set(current_step_ids)),
                })

        # Post-Processing: Apply Minimum 200m Floor Rule & Remainder Merging
        final_segments: List[Dict[str, Any]] = []

        for seg in raw_segments:
            if seg["distance_m"] < MIN_SEGMENT_LENGTH_METERS and len(final_segments) > 0:
                prev = final_segments[-1]
                prev_coords = prev["coords"]
                new_coords = seg["coords"]
                if prev_coords[-1] == new_coords[0]:
                    merged_coords = prev_coords + new_coords[1:]
                else:
                    merged_coords = prev_coords + new_coords

                prev["coords"] = merged_coords
                prev["distance_m"] = round(prev["distance_m"] + seg["distance_m"], 1)
                prev["step_ids"] = list(set(prev["step_ids"] + seg["step_ids"]))
            else:
                final_segments.append(seg)

        if not final_segments:
            final_segments = raw_segments if raw_segments else [
                {
                    "coords": all_coords,
                    "distance_m": actual_distance,
                    "road_name": "Route Segment",
                    "road_type": LOCAL,
                    "speed_kmh": 25.0,
                    "step_ids": ["step_000"],
                }
            ]

        # Build Output Format
        output: List[Dict[str, Any]] = []
        total_seg_dist = sum(s["distance_m"] for s in final_segments)

        for idx, seg in enumerate(final_segments):
            coords = seg["coords"]
            dist_m = seg["distance_m"]
            dur_s = (dist_m / total_seg_dist * total_duration_s) if total_seg_dist > 0 else 0.0
            centroid = calculate_coordinates_centroid(coords)

            given_speed = seg.get("speed_kmh")
            speed_kmh, speed_src = derive_segment_speed_and_source(
                seg["road_type"],
                osrm_speed_kmh=given_speed if (given_speed and given_speed > 0) else None
            )

            output.append({
                "segment_id": f"seg_{idx:03d}",
                "sequence_index": idx,
                "road_name": seg["road_name"],
                "road_type": seg["road_type"],
                "distance_m": round(dist_m, 1),
                "duration_s": round(dur_s, 1),
                "centroid_latitude": centroid["latitude"],
                "centroid_longitude": centroid["longitude"],
                "geometry": {"type": "LineString", "coordinates": coords},
                "source_step_ids": seg["step_ids"],
                "speed_kmh": speed_kmh,
                "speed_source": speed_src,
            })

        return output


segmentation_engine = RouteSegmentationEngine()
