import { describe, it, expect } from "vitest";
import { MAP_CONFIG, MAP_PROVIDERS, getActiveMapProvider, RISK_THRESHOLDS, getRiskCategoryFromScore, getRiskColor } from "../config/mapConfig";

describe("Leaflet Map Engine & Risk Threshold Unit Tests", () => {
  it("exports keyless OpenStreetMap Dark Tactical default provider", () => {
    const activeProvider = getActiveMapProvider();
    expect(activeProvider.id).toBe("osm_dark");
    expect(activeProvider.url).toContain("openstreetmap.org");
    expect(activeProvider.attribution).toContain("OpenStreetMap");
    expect(activeProvider.requiresKey).toBe(false);
    expect(activeProvider.className).toBe("dark-tile-filter");
  });

  it("supports optional CARTO Dark Matter provider configuration", () => {
    expect(MAP_PROVIDERS.carto_dark.id).toBe("carto_dark");
    expect(MAP_PROVIDERS.carto_dark.requiresKey).toBe(true);
    expect(MAP_PROVIDERS.carto_dark.url("TEST_KEY")).toContain("api_key=TEST_KEY");
  });

  it("calculates correct risk category based on risk score thresholds", () => {
    expect(getRiskCategoryFromScore(15)).toBe("Low");
    expect(getRiskCategoryFromScore(25)).toBe("Low");
    expect(getRiskCategoryFromScore(40)).toBe("Medium");
    expect(getRiskCategoryFromScore(50)).toBe("Medium");
    expect(getRiskCategoryFromScore(65)).toBe("High");
    expect(getRiskCategoryFromScore(75)).toBe("High");
    expect(getRiskCategoryFromScore(85)).toBe("Critical");
    expect(getRiskCategoryFromScore(100)).toBe("Critical");
  });

  it("returns correct risk color hex codes for Leaflet markers", () => {
    expect(getRiskColor("Low")).toBe(RISK_THRESHOLDS.LOW.color);
    expect(getRiskColor("Medium")).toBe(RISK_THRESHOLDS.MEDIUM.color);
    expect(getRiskColor("High")).toBe(RISK_THRESHOLDS.HIGH.color);
    expect(getRiskColor("Critical")).toBe(RISK_THRESHOLDS.CRITICAL.color);
    expect(getRiskColor("Unknown")).toBe("#6B7280");
  });
});
