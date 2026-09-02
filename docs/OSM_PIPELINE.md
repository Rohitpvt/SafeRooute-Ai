# OpenStreetMap (OSM) Road Infrastructure Pipeline — SafeRoute AI

## 1. Overview
The **OSM Road Infrastructure Pipeline** extracts, normalizes, validates, and indexes road segments for the **Delhi NCR** region (and future configurable regions) to populate the `road_segments` PostGIS database table.

This pipeline forms the spatial-infrastructure foundation for map-matching historical accidents (Phase 3) and constructing multi-source feature matrices (Phase 5).

---

## 2. Region Configuration (`backend/app/config/regions.py`)

Regions are defined using bounding box envelopes (`min_lat, min_lng, max_lat, max_lng`):

- **Delhi NCR Envelope**: `(28.40, 76.85, 28.88, 77.45)`
- **Default H3 Resolution**: Resolution 8 ($\sim 0.737 \text{ km}^2$ cell area)

---

## 3. Included & Excluded Road Classes

| Taxonomy Category | Included OSM `highway` Classes | Excluded Non-Drivable Classes |
| :--- | :--- | :--- |
| **Drivable Roads** | `motorway`, `trunk`, `primary`, `secondary`, `tertiary`, `residential`, `unclassified`, `living_street`, `service` | `footway`, `steps`, `cycleway`, `pedestrian`, `path`, `bridleway`, `track`, `proposed`, `construction` |

---

## 4. Attribute Normalization & Imputation Policy

| Attribute | Raw OSM Tag | Normalization Logic | Imputation Fallback (When Tag Missing) |
| :--- | :--- | :--- | :--- |
| `road_type` | `highway` | Standardized lowercase string | N/A (Excluded if not drivable) |
| `lanes` | `lanes` | Parsed integer (e.g. `"2;3"` $\rightarrow 2$) | Class defaults (`motorway`=4, `primary`=3, `secondary`=2, `residential`=1) |
| `speed_limit` | `maxspeed` | Parsed km/h integer (e.g. `"50 km/h"`, `"30 mph"` $\rightarrow 48$) | Class defaults (`motorway`=80, `primary`=60, `secondary`=50, `residential`=30) |
| `is_junction` | `junction` | Boolean (`"roundabout"`, `"junction"`) | `False` |
| `is_lit` | `lit` | Boolean (`"yes"`, `"true"`, `"1"`) | `False` |
| `h3_index` | Geometry Centroid | `h3.latlng_to_cell(centroid_lat, centroid_lng, res=8)` | Default fallback cell |

*Note*: Imputed lane counts and speed limits are flagged internally (`lanes_imputed`, `speed_imputed`) to ensure auditability for research reproducibility.

---

## 5. Geometry Processing & PostGIS Compatibility

- Node coordinate sequences are validated and converted into Shapely `LineString` WKT (`geometry_wkt`).
- Under **PostgreSQL + PostGIS**, geometries are indexed using Spatial GIST indexes (`idx_road_segments_geom`).
- Under **SQLite fallback**, WKT strings are persisted without requiring Spatialite binary DDL extensions.

---

## 6. Execution & CLI Options

The pipeline can be executed via Python CLI:

```bash
# 1. Execute dry-run (Validation & Quarantine artifact generation without DB persistence)
python -m app.services.osm_pipeline --region delhi_ncr --dry-run

# 2. Execute full ingestion with database persistence (Idempotent upsert into road_segments)
python -m app.services.osm_pipeline --region delhi_ncr

# 3. Execute with element limit cap (For fast local testing)
python -m app.services.osm_pipeline --region delhi_ncr --limit 500
```

---

## 7. OpenStreetMap Licensing & Attribution
Data extracted via OpenStreetMap Overpass API is licensed under the **Open Database License (ODbL)**. Any public redistribution or display of OSM-derived maps in SafeRoute AI must maintain visible attribution:
> `© OpenStreetMap contributors`
