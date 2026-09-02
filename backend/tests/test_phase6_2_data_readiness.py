import json
import os
import pytest
from fastapi.testclient import TestClient

from app.services.source_registry import source_registry
from ml.data_readiness import data_readiness_validator


def test_source_registry_registration_and_export():
    """Tests data source registry registration and JSON file export."""
    registry_file = source_registry.export_registry()
    assert os.path.exists(registry_file)

    with open(registry_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "sources" in data
    assert len(data["sources"]) >= 4

    src_blackspot = source_registry.get_source_by_id("SRC-DELHI-BLACKSPOTS-2024")
    assert src_blackspot is not None
    assert src_blackspot.provenance_level == "BLACKSPOT_CONTEXT"


def test_quality_score_calculation():
    """Tests deterministic record quality score calculation."""
    q_high = data_readiness_validator.calculate_quality_score(
        has_gps=True, has_hourly_ts=True, is_real=True, has_severity=True, map_match_dist=10.0
    )
    q_synth = data_readiness_validator.calculate_quality_score(
        has_gps=False, has_hourly_ts=False, is_real=False, has_severity=False, map_match_dist=45.0
    )

    assert q_high == 100.0
    assert q_synth == 12.0
    assert q_high > q_synth


@pytest.mark.asyncio
async def test_data_readiness_assessment_and_phase7_gate(client: TestClient):
    """Tests readiness level assessment and verifies Phase 7 authorization remains strictly FALSE."""
    res = await data_readiness_validator.assess_readiness()

    assert "readiness_level" in res
    assert "readiness_level_name" in res
    assert "inventory" in res
    assert res["phase_7_authorized"] is False
    assert len(res["blocking_reasons"]) > 0

    readiness_file = os.path.join("data", "readiness", "delhi_ncr_data_readiness.json")
    assert os.path.exists(readiness_file)
