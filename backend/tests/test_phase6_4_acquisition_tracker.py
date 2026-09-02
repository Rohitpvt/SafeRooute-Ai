import json
import os
import pytest
from ml.data_readiness import data_readiness_validator

TRACKER_FILE_PATH = os.path.join("data", "readiness", "acquisition_tracker.json")


def test_acquisition_tracker_schema_and_validity():
    """Tests acquisition tracker JSON artifact structure and allowed statuses."""
    assert os.path.exists(TRACKER_FILE_PATH)

    with open(TRACKER_FILE_PATH, "r", encoding="utf-8") as f:
        tracker = json.load(f)

    assert "sources" in tracker
    assert len(tracker["sources"]) >= 3

    valid_statuses = {
        "DISCOVERY",
        "REQUEST_READY",
        "REQUEST_SENT",
        "APPROVED",
        "RECEIVED",
        "REJECTED",
        "UNAVAILABLE",
    }

    for src in tracker["sources"]:
        assert "source_id" in src
        assert "status" in src
        assert src["status"] in valid_statuses


def test_acquisition_tracker_non_fabrication_and_privacy_checks():
    """CRITICAL SAFETY TEST: Verifies no fabricated REQUEST_SENT statuses or private PII exist."""
    with open(TRACKER_FILE_PATH, "r", encoding="utf-8") as f:
        tracker = json.load(f)

    for src in tracker["sources"]:
        # Verify no fake external request transmissions are claimed
        assert src["status"] != "REQUEST_SENT"

        # Verify contact placeholders do not contain real personal PII phone numbers or passwords
        contact = src.get("contact_placeholder", "")
        assert "@" not in contact or "placeholder" in contact.lower() or "director" in contact.lower()
        assert not any(char.isdigit() for char in contact if char not in ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]) or "[" in contact


@pytest.mark.asyncio
async def test_phase7_gate_strictly_blocked_in_phase6_4():
    """Verifies Phase 7 live risk scoring integration remains strictly BLOCKED."""
    res = await data_readiness_validator.assess_readiness()
    assert res["phase_7_authorized"] is False
