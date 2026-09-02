import json
import os
from datetime import datetime
from typing import Any, Optional
from pydantic import BaseModel

REGISTRY_FILE_PATH = os.path.join("data", "readiness", "source_registry.json")


class DataPointSource(BaseModel):
    source_id: str
    source_name: str
    organization: str
    source_type: str  # TIER_A, TIER_B, TIER_C, TIER_D, TIER_E
    access_method: str  # REST_API, MANUAL_CSV, DOWNLOAD_LINK, PRIVATE
    url: Optional[str] = None
    license: str
    geographic_scope: str
    temporal_scope: str
    coordinate_precision: str  # EXACT_GPS, GEODESIC_ESTIMATE, BLACKSPOT_CENTROID
    timestamp_precision: str  # HOURLY_UTC, DATE_ONLY, APPROXIMATE
    severity_available: bool
    provenance_level: str
    verification_status: str  # VERIFIED, UNVERIFIED, RESTRICTED
    last_verified: str


KNOWN_SOURCES: list[DataPointSource] = [
    DataPointSource(
        source_id="SRC-DELHI-BLACKSPOTS-2024",
        source_name="Delhi Traffic Police Official 117 High-Fatality Blackspots",
        organization="Delhi Traffic Police / MoRTH India",
        source_type="TIER_C",
        access_method="MANUAL_CSV",
        url="https://delhitrafficpolice.nic.in/",
        license="Government Open Data / Public Spatial Prior",
        geographic_scope="Delhi NCR",
        temporal_scope="2021-2024",
        coordinate_precision="BLACKSPOT_CENTROID",
        timestamp_precision="APPROXIMATE",
        severity_available=True,
        provenance_level="BLACKSPOT_CONTEXT",
        verification_status="VERIFIED",
        last_verified="2026-08-31",
    ),
    DataPointSource(
        source_id="SRC-MORTH-IRAD-2024",
        source_name="Integrated Road Accident Database (iRAD / eDAR)",
        organization="Ministry of Road Transport and Highways (MoRTH)",
        source_type="TIER_A",
        access_method="PRIVATE",
        url="https://irad.parivahan.gov.in/",
        license="Restricted Government Access",
        geographic_scope="National / Delhi NCR",
        temporal_scope="2021-2025",
        coordinate_precision="EXACT_GPS",
        timestamp_precision="HOURLY_UTC",
        severity_available=True,
        provenance_level="RESEARCH_REAL",
        verification_status="RESTRICTED",
        last_verified="2026-08-31",
    ),
    DataPointSource(
        source_id="SRC-OPEN-METEO-ARCHIVE",
        source_name="Open-Meteo Historical Weather Archive API",
        organization="Open-Meteo.com",
        source_type="TIER_B",
        access_method="REST_API",
        url="https://archive-api.open-meteo.com/v1/archive",
        license="CC BY 4.0",
        geographic_scope="Global / Delhi NCR",
        temporal_scope="1940-2026",
        coordinate_precision="GEODESIC_ESTIMATE",
        timestamp_precision="HOURLY_UTC",
        severity_available=False,
        provenance_level="RESEARCH_REAL",
        verification_status="VERIFIED",
        last_verified="2026-08-31",
    ),
    DataPointSource(
        source_id="SRC-SYNTHETIC-TEST-FIXTURES",
        source_name="SafeRoute AI Pipeline Synthetic Test Fixtures",
        organization="SafeRoute AI Team",
        source_type="TIER_E",
        access_method="MANUAL_CSV",
        url=None,
        license="Internal Test Fixture",
        geographic_scope="Delhi NCR Test Envelope",
        temporal_scope="2024-2026",
        coordinate_precision="GEODESIC_ESTIMATE",
        timestamp_precision="HOURLY_UTC",
        severity_available=True,
        provenance_level="PIPELINE_SYNTHETIC",
        verification_status="VERIFIED",
        last_verified="2026-08-31",
    ),
]


class SourceRegistryManager:
    """Manages data source registration, provenance metadata, and verification catalog."""

    def __init__(self, registry_file: str = REGISTRY_FILE_PATH):
        self.registry_file = registry_file

    def export_registry(self) -> str:
        """Exports source registry catalog to JSON file."""
        os.makedirs(os.path.dirname(self.registry_file), exist_ok=True)
        payload = [src.model_dump() for src in KNOWN_SOURCES]
        with open(self.registry_file, "w", encoding="utf-8") as f:
            json.dump({"sources": payload, "updated_at": datetime.utcnow().isoformat() + "Z"}, f, indent=2)
        return self.registry_file

    def get_source_by_id(self, source_id: str) -> Optional[DataPointSource]:
        """Finds source by source_id."""
        for src in KNOWN_SOURCES:
            if src.source_id == source_id:
                return src
        return None


source_registry = SourceRegistryManager()
