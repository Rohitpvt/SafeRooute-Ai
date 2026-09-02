import json
import os
from datetime import datetime
from app.logging_config import logger


class OsmQuarantineManager:
    """Manages rejected / quarantined OSM way records for auditing and data quality analysis."""

    def __init__(self, log_dir: str = "logs"):
        self.log_dir = log_dir
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir, exist_ok=True)

    def save_quarantine_artifact(
        self, run_id: str, rejected_records: list[dict]
    ) -> str:
        """Saves quarantined records to a structured JSON artifact file.
        
        Args:
            run_id: Unique ingestion run identifier.
            rejected_records: List of dicts containing osm_way_id, reason, raw_tags.
            
        Returns:
            Absolute filepath of created artifact.
        """
        filename = f"osm_quarantine_run_{run_id}.json"
        filepath = os.path.join(self.log_dir, filename)

        payload = {
            "run_id": run_id,
            "quarantined_at": datetime.utcnow().isoformat() + "Z",
            "total_quarantined": len(rejected_records),
            "records": rejected_records,
        }

        try:
            with open(filepath, "w", encoding="utf-8") as f:
                json.dump(payload, f, indent=2)
            logger.info(
                f"Quarantine artifact created: {filepath} ({len(rejected_records)} rejected records)"
            )
            return filepath
        except Exception as e:
            logger.error(f"Failed to write quarantine artifact: {str(e)}")
            return ""


quarantine_manager = OsmQuarantineManager()
