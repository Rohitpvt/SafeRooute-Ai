import os
import pytest
from app.services.source_registry import source_registry
from ml.data_readiness import data_readiness_validator


def test_source_acquisition_priority_ranking():
    """Tests data acquisition source priority ranking for Delhi NCR."""
    src_irad = source_registry.get_source_by_id("SRC-MORTH-IRAD-2024")
    src_blackspot = source_registry.get_source_by_id("SRC-DELHI-BLACKSPOTS-2024")

    assert src_irad is not None
    assert src_blackspot is not None

    # iRAD/eDAR is Tier A (Primary Target), Blackspots is Tier C (Spatial Prior Context)
    assert src_irad.source_type == "TIER_A"
    assert src_blackspot.source_type == "TIER_C"


def test_data_request_specification_fields():
    """Tests data request specification mandatory field compliance."""
    mandatory_fields = ["latitude", "longitude", "date", "timestamp"]
    preferred_fields = ["severity", "road_type", "collision_type"]

    mock_record = {
        "latitude": 28.6139,
        "longitude": 77.2090,
        "date": "2024-05-15",
        "timestamp": "2024-05-15T14:30:00Z",
        "severity": "Fatal",
    }

    for f in mandatory_fields:
        assert f in mock_record


@pytest.mark.asyncio
async def test_phase7_gate_strictly_blocked_in_phase6_3():
    """Verifies Phase 7 live risk scoring integration is strictly blocked."""
    res = await data_readiness_validator.assess_readiness()
    assert res["phase_7_authorized"] is False
    assert "Insufficient multi-year real crash observations" in res["blocking_reasons"][0]
