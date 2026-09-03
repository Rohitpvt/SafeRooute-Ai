/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase D: Environmental Intelligence & Resilience Unit Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  EnvironmentService,
  ENVIRONMENTAL_QUALITY_STATES,
  WEATHER_STATES,
} from "../services/environmentService.js";
import { safetyRuleEngine } from "../services/SafetyRuleEngine.js";

describe("Phase D: EnvironmentService Engine & Weather Rules", () => {
  let envService;

  beforeEach(() => {
    envService = new EnvironmentService();

    vi.stubGlobal("fetch", vi.fn());
    vi.stubGlobal("window", {
      navigator: { onLine: true },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------------
  // A. FRESHNESS & QUALITY CALCULATION
  // ------------------------------------------------------------------------
  describe("Freshness & Data Quality Calculation", () => {
    it("1. Timestamps <= 5 min return VALID", () => {
      const now = 1000000;
      const fetched = now - 120000; // 2 min ago
      expect(envService.calculateFreshnessQuality(fetched, now)).toBe(ENVIRONMENTAL_QUALITY_STATES.VALID);
    });

    it("2. Timestamps 5-15 min return RECENT", () => {
      const now = 1000000;
      const fetched = now - 400000; // 6.6 min ago
      expect(envService.calculateFreshnessQuality(fetched, now)).toBe(ENVIRONMENTAL_QUALITY_STATES.RECENT);
    });

    it("3. Timestamps 15-30 min return DEGRADED", () => {
      const now = 1000000;
      const fetched = now - 1200000; // 20 min ago
      expect(envService.calculateFreshnessQuality(fetched, now)).toBe(ENVIRONMENTAL_QUALITY_STATES.DEGRADED);
    });

    it("4. Timestamps > 30 min return STALE", () => {
      const now = 1000000;
      const fetched = now - 2000000; // 33.3 min ago
      expect(envService.calculateFreshnessQuality(fetched, now)).toBe(ENVIRONMENTAL_QUALITY_STATES.STALE);
    });
  });

  // ------------------------------------------------------------------------
  // B. LOCATION-AWARE CACHE RELEVANCE
  // ------------------------------------------------------------------------
  describe("Location-Aware Cache", () => {
    it("5. Reuses cache within 2.0 km radius and 5 min TTL", () => {
      envService.cache = {
        data: { weather_state: WEATHER_STATES.CLEAR },
        lat: 28.6139,
        lng: 77.209,
        fetchedAtMs: 1000000,
      };

      // Move 500m away at +1 min -> Cache valid
      const isValid = envService.isCacheValid(28.6184, 77.209, 1060000);
      expect(isValid).toBe(true);
    });

    it("6. Invalidates cache when vehicle moves > 2.0 km away", () => {
      envService.cache = {
        data: { weather_state: WEATHER_STATES.CLEAR },
        lat: 28.6139,
        lng: 77.209,
        fetchedAtMs: 1000000,
      };

      // Move 5 km away -> Cache invalid
      const isValid = envService.isCacheValid(28.6589, 77.209, 1060000);
      expect(isValid).toBe(false);
    });
  });

  // ------------------------------------------------------------------------
  // C. NETWORK FAILURES & OFFLINE MODE
  // ------------------------------------------------------------------------
  describe("Network Failures & Offline Mode", () => {
    it("7. Returns UNAVAILABLE & 'Offline Mode' when browser is offline", async () => {
      vi.stubGlobal("window", {
        navigator: { onLine: false },
      });

      const result = await envService.getEnvironmentalContext(28.6139, 77.209);
      expect(result.quality).toBe(ENVIRONMENTAL_QUALITY_STATES.UNAVAILABLE);
      expect(result.is_offline).toBe(true);
      expect(result.display_status).toBe("Offline Mode");
      expect(fetch).not.toHaveBeenCalled();
    });

    it("8. Gracefully falls back to UNAVAILABLE when network fetch throws error", async () => {
      fetch.mockRejectedValue(new Error("Network connection lost"));

      const result = await envService.getEnvironmentalContext(28.6139, 77.209);
      expect(result.quality).toBe(ENVIRONMENTAL_QUALITY_STATES.UNAVAILABLE);
      expect(result.weather_modifier).toBe(1.0);
    });
  });

  // ------------------------------------------------------------------------
  // D. WEATHER SPEED MODIFIERS (M_weather)
  // ------------------------------------------------------------------------
  describe("Weather Speed Modifiers (M_weather)", () => {
    it("9. Heavy Rain / Storm / Low Visibility + VALID returns 0.85 modifier", () => {
      const mod = envService.calculateWeatherModifier(
        WEATHER_STATES.HEAVY_RAIN,
        ENVIRONMENTAL_QUALITY_STATES.VALID
      );
      expect(mod).toBe(0.85);
    });

    it("10. Light Rain / Fog + VALID returns 0.92 modifier", () => {
      const mod = envService.calculateWeatherModifier(
        WEATHER_STATES.FOG,
        ENVIRONMENTAL_QUALITY_STATES.VALID
      );
      expect(mod).toBe(0.92);
    });

    it("11. STALE or UNAVAILABLE quality returns 1.0 modifier (disables modifier)", () => {
      const staleMod = envService.calculateWeatherModifier(
        WEATHER_STATES.HEAVY_RAIN,
        ENVIRONMENTAL_QUALITY_STATES.STALE
      );
      expect(staleMod).toBe(1.0);

      const unavailMod = envService.calculateWeatherModifier(
        WEATHER_STATES.HEAVY_RAIN,
        ENVIRONMENTAL_QUALITY_STATES.UNAVAILABLE
      );
      expect(unavailMod).toBe(1.0);
    });
  });

  // ------------------------------------------------------------------------
  // E. RULE INTEGRATION (RULE-WEATHER-01)
  // ------------------------------------------------------------------------
  describe("SafetyRuleEngine RULE-WEATHER-01 Integration", () => {
    it("12. Heavy Rain + VALID quality generates RULE-WEATHER-01 (CAUTION)", () => {
      const candidates = safetyRuleEngine.evaluateRules({
        telemetry: { speed_kmh: 50, accuracy_m: 5.0 },
        roadMetadata: {},
        overrides: { weatherState: "HEAVY_RAIN" },
        dataQuality: { weather: "VALID" },
      });

      const weatherCandidate = candidates.find((c) => c.rule_id === "RULE-WEATHER-01");
      expect(weatherCandidate).toBeDefined();
      expect(weatherCandidate.severity).toBe("CAUTION");
      expect(weatherCandidate.rule_name).toBe("Adverse Weather Warning");
    });

    it("13. STALE or UNAVAILABLE weather quality suppresses RULE-WEATHER-01 candidate", () => {
      const candidates = safetyRuleEngine.evaluateRules({
        telemetry: { speed_kmh: 50, accuracy_m: 5.0 },
        roadMetadata: {},
        overrides: { weatherState: "HEAVY_RAIN" },
        dataQuality: { weather: "STALE" },
      });

      const weatherCandidate = candidates.find((c) => c.rule_id === "RULE-WEATHER-01");
      expect(weatherCandidate).toBeUndefined();
    });

    it("14. Environmental rules NEVER generate CRITICAL DRIVER WARNING", () => {
      const candidates = safetyRuleEngine.evaluateRules({
        telemetry: { speed_kmh: 50, accuracy_m: 5.0 },
        roadMetadata: {},
        overrides: { weatherState: "STORM" },
        dataQuality: { weather: "VALID" },
      });

      const weatherCandidate = candidates.find((c) => c.rule_id === "RULE-WEATHER-01");
      expect(weatherCandidate.severity).not.toBe("CRITICAL DRIVER WARNING");
      expect(weatherCandidate.severity).toBe("CAUTION");
    });
  });
});
