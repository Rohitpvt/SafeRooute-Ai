import pytest
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from app.main import app
from app.services.ai_geocoding_service import (
    AIGeocodingService,
    validate_delhi_ncr_bounds,
    normalize_query_key,
    verify_query_match,
)

client = TestClient(app)


def test_bounding_box_validation():
    """Test 1 & 11: Validates Delhi NCR bounding box bounds check."""
    # Delhi NCR valid point (India Gate)
    assert validate_delhi_ncr_bounds(28.6129, 77.2295) is True
    # Out of bounds point (Mumbai)
    assert validate_delhi_ncr_bounds(19.0760, 72.8777) is False
    # Out of bounds point (London)
    assert validate_delhi_ncr_bounds(51.5074, -0.1278) is False


def test_query_normalization():
    """Test query string normalization for caching."""
    assert normalize_query_key("  Karol   Bagh!! ") == "karol bagh"
    assert normalize_query_key("SHALIMAR-BAGH") == "shalimarbagh"


def test_query_match_validation():
    """Test 12: Deterministic query match validation."""
    assert verify_query_match("Karol Bagh", "Karol Bagh, New Delhi") is True
    assert verify_query_match("Karol Bagh", "Faridabad Sector 15") is False


@pytest.mark.asyncio
async def test_local_preset_fastpath():
    """Test 1: Local preset lookup returns verified result with 0ms delay."""
    service = AIGeocodingService()
    result = await service.geocode("connaught place")
    assert result["match_status"] == "verified"
    assert result["source"] == "LOCAL_PRESET"
    assert result["latitude"] == 28.6315
    assert result["longitude"] == 77.2167


@pytest.mark.asyncio
async def test_gemini_interpretation_fallback_chain():
    """Test 2-6: Gemini query interpretation with authoritative geocoder resolution."""
    service = AIGeocodingService(api_key="mock_key")

    mock_ai_intent = {"place": "CustomPlaceName", "landmark": "Max Hospital", "locality": "CustomArea", "city": "Delhi"}
    mock_nominatim = [{
        "location_name": "CustomPlaceName, Delhi",
        "latitude": 28.7167,
        "longitude": 77.1667,
        "source": "NOMINATIM",
        "match_status": "verified"
    }]

    with patch.object(service, "interpret_query_with_gemini", new_callable=AsyncMock) as mock_interpret, \
         patch.object(service, "query_nominatim", new_callable=AsyncMock) as mock_nom:
        
        mock_interpret.return_value = mock_ai_intent
        mock_nom.return_value = mock_nominatim

        result = await service.geocode("CustomPlaceName near Max Hospital")

        assert result["match_status"] == "verified"
        assert result["source"] == "NOMINATIM"
        assert result["latitude"] == 28.7167
        assert result["longitude"] == 77.1667
        assert result["ai_status"] == "interpreted"
        assert result["ai_interpretation"]["place"] == "CustomPlaceName"


@pytest.mark.asyncio
async def test_no_match_deterministic_failure():
    """Test 5 & 10: Returns deterministic no_match response for unresolvable queries."""
    service = AIGeocodingService()
    with patch.object(service, "interpret_query_with_gemini", new_callable=AsyncMock) as mock_interpret, \
         patch.object(service, "query_nominatim", new_callable=AsyncMock) as mock_nom, \
         patch.object(service, "query_open_meteo", new_callable=AsyncMock) as mock_om:
        
        mock_interpret.return_value = None
        mock_nom.return_value = []
        mock_om.return_value = []

        result = await service.geocode("XYZ12345NonExistentPlace")

        assert result["match_status"] == "no_match"
        assert result["source"] == "NONE"
        assert result["latitude"] == 0.0
        assert result["longitude"] == 0.0
