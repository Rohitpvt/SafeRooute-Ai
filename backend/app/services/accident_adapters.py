import hashlib
from datetime import datetime
from typing import Any


class BaseAccidentAdapter:
    """Base class for all accident and blackspot source data adapters."""

    source_name: str = "Base_Adapter"
    default_dataset_mode: str = "RESEARCH_REAL"
    default_record_type: str = "ACCIDENT_RECORD"

    def generate_fingerprint(
        self, source_record_id: str | None, lat: float, lng: float, timestamp: datetime
    ) -> str:
        """Generates a deterministic fingerprint for deduplication when record_id is absent."""
        if source_record_id and str(source_record_id).strip():
            return f"{self.source_name}_{str(source_record_id).strip()}"
        
        raw_key = f"{self.source_name}_{round(lat, 5)}_{round(lng, 5)}_{timestamp.isoformat()}"
        return hashlib.md5(raw_key.encode("utf-8")).hexdigest()

    def normalize_severity(self, severity_raw: Any) -> str:
        """Normalizes severity strings into standard taxonomy: Minor, Serious, Fatal, Unknown."""
        if not severity_raw:
            return "Unknown"
        val = str(severity_raw).strip().lower()
        if "fatal" in val or "death" in val or "killed" in val or val == "3":
            return "Fatal"
        if "serious" in val or "severe" in val or "hospital" in val or val == "2":
            return "Serious"
        if "minor" in val or "slight" in val or "injury" in val or val == "1":
            return "Minor"
        return "Unknown"

    def normalize_timestamp(self, ts_raw: Any) -> datetime | None:
        """Parses ISO or standard datetime strings into datetime object."""
        if isinstance(ts_raw, datetime):
            return ts_raw
        if not ts_raw:
            return None
        
        try:
            return datetime.fromisoformat(str(ts_raw).replace("Z", "+00:00"))
        except Exception:
            try:
                return datetime.strptime(str(ts_raw).strip(), "%Y-%m-%d %H:%M:%S")
            except Exception:
                return None

    def adapt_record(self, raw: dict[str, Any]) -> dict[str, Any]:
        """Translates a raw record dict into the canonical internal schema.
        
        Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement adapt_record.")


class DelhiBlackspotAdapter(BaseAccidentAdapter):
    """Adapter for official Delhi Traffic Police Blackspot Locations.
    
    CRITICAL: Blackspots represent spatial prior hotspots, NOT individual crash events.
    Record type is explicitly set to BLACKSPOT_RECORD.
    """

    source_name = "Delhi_Traffic_Police_Blackspots"
    default_dataset_mode = "RESEARCH_REAL"
    default_record_type = "BLACKSPOT_RECORD"

    def adapt_record(self, raw: dict[str, Any]) -> dict[str, Any]:
        source_id = raw.get("blackspot_id") or raw.get("id")
        lat = float(raw.get("latitude") or raw.get("lat") or 0.0)
        lng = float(raw.get("longitude") or raw.get("lng") or 0.0)
        ts = self.normalize_timestamp(raw.get("timestamp") or raw.get("year_designated") or "2024-01-01 00:00:00")
        
        fingerprint = self.generate_fingerprint(source_id, lat, lng, ts or datetime(2024, 1, 1))

        return {
            "source_name": self.source_name,
            "source_record_id": str(source_id) if source_id else fingerprint,
            "dataset_mode": raw.get("dataset_mode", self.default_dataset_mode),
            "record_type": self.default_record_type,
            "original_timestamp": ts or datetime(2024, 1, 1),
            "severity": self.normalize_severity(raw.get("severity", "Fatal")),
            "latitude": lat,
            "longitude": lng,
            "raw_attributes": raw,
        }


class AcademicCrashAdapter(BaseAccidentAdapter):
    """Adapter for open academic/research individual crash datasets for Delhi NCR."""

    source_name = "Academic_Delhi_Crash_Dataset"
    default_dataset_mode = "RESEARCH_REAL"
    default_record_type = "ACCIDENT_RECORD"

    def adapt_record(self, raw: dict[str, Any]) -> dict[str, Any]:
        source_id = raw.get("crash_id") or raw.get("id")
        lat = float(raw.get("latitude") or raw.get("lat") or 0.0)
        lng = float(raw.get("longitude") or raw.get("lng") or 0.0)
        ts = self.normalize_timestamp(raw.get("timestamp") or raw.get("crash_time"))
        
        fingerprint = self.generate_fingerprint(source_id, lat, lng, ts or datetime.utcnow())

        return {
            "source_name": raw.get("source_name", self.source_name),
            "source_record_id": str(source_id) if source_id else fingerprint,
            "dataset_mode": raw.get("dataset_mode", self.default_dataset_mode),
            "record_type": self.default_record_type,
            "original_timestamp": ts or datetime.utcnow(),
            "severity": self.normalize_severity(raw.get("severity")),
            "latitude": lat,
            "longitude": lng,
            "raw_attributes": raw,
        }


class SyntheticFixtureAdapter(BaseAccidentAdapter):
    """Adapter for pipeline testing fixtures. Explicitly tagged PIPELINE_SYNTHETIC."""

    source_name = "Pipeline_Synthetic_Fixtures"
    default_dataset_mode = "PIPELINE_SYNTHETIC"
    default_record_type = "ACCIDENT_RECORD"

    def adapt_record(self, raw: dict[str, Any]) -> dict[str, Any]:
        source_id = raw.get("fixture_id") or raw.get("id")
        lat = float(raw.get("latitude") or 0.0)
        lng = float(raw.get("longitude") or 0.0)
        ts = self.normalize_timestamp(raw.get("timestamp")) or datetime.utcnow()

        fingerprint = self.generate_fingerprint(source_id, lat, lng, ts)

        return {
            "source_name": self.source_name,
            "source_record_id": str(source_id) if source_id else fingerprint,
            "dataset_mode": "PIPELINE_SYNTHETIC",
            "record_type": raw.get("record_type", self.default_record_type),
            "original_timestamp": ts,
            "severity": self.normalize_severity(raw.get("severity")),
            "latitude": lat,
            "longitude": lng,
            "raw_attributes": raw,
        }
