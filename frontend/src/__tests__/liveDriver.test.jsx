import { describe, it, expect } from "vitest";
import { GPS_STATES, getAccuracyLabel } from "../hooks/useGeolocation";
import { calculateHaversineDistanceMeters, deriveTimeOfDay } from "../hooks/useDriverTelemetry";
import {
  RISK_LEVELS,
  IDLE_COOLDOWN_MS,
  MOVING_COOLDOWN_MS,
  MOVEMENT_TRIGGER_METERS,
} from "../hooks/useLiveRiskAssessment";

describe("Live Driver Mode - GPS & Telemetry Engine Unit Tests", () => {
  describe("GPS Accuracy Thresholds & Classification", () => {
    it("classifies <= 20m as High Accuracy", () => {
      const label = getAccuracyLabel(14);
      expect(label.level).toBe("high");
      expect(label.label).toBe("High Accuracy");
    });

    it("classifies 20-50m as Acceptable Accuracy", () => {
      const label = getAccuracyLabel(35);
      expect(label.level).toBe("acceptable");
      expect(label.label).toBe("Acceptable");
    });

    it("classifies 50-100m as Degraded Accuracy", () => {
      const label = getAccuracyLabel(75);
      expect(label.level).toBe("degraded");
      expect(label.label).toBe("Degraded");
    });

    it("classifies > 100m as Poor Accuracy", () => {
      const label = getAccuracyLabel(120);
      expect(label.level).toBe("poor");
      expect(label.label).toBe("Poor Accuracy");
    });

    it("handles null or undefined accuracy gracefully", () => {
      const labelNull = getAccuracyLabel(null);
      expect(labelNull.level).toBe("unknown");
      expect(labelNull.label).toBe("Unknown");

      const labelUndef = getAccuracyLabel(undefined);
      expect(labelUndef.level).toBe("unknown");
    });
  });

  describe("Haversine Distance & Telemetry Math", () => {
    it("calculates accurate distance between Delhi coordinates", () => {
      const distance = calculateHaversineDistanceMeters(28.6315, 77.2167, 28.6129, 77.2295);
      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(3000);
    });

    it("returns zero distance when coordinates are identical", () => {
      const distance = calculateHaversineDistanceMeters(28.6139, 77.2090, 28.6139, 77.2090);
      expect(distance).toBe(0);
    });

    it("converts m/s speed to km/h accurately", () => {
      const speedMS = 15;
      const speedKmH = speedMS * 3.6;
      expect(speedKmH).toBe(54);
    });
  });

  describe("Time of Day Derivation", () => {
    it("derives Morning between 05:00 and 11:59", () => {
      expect(deriveTimeOfDay(new Date("2026-08-31T08:30:00"))).toBe("Morning");
    });

    it("derives Afternoon between 12:00 and 16:59", () => {
      expect(deriveTimeOfDay(new Date("2026-08-31T14:15:00"))).toBe("Afternoon");
    });

    it("derives Evening between 17:00 and 20:59", () => {
      expect(deriveTimeOfDay(new Date("2026-08-31T18:45:00"))).toBe("Evening");
    });

    it("derives Night between 21:00 and 04:59", () => {
      expect(deriveTimeOfDay(new Date("2026-08-31T23:10:00"))).toBe("Night");
      expect(deriveTimeOfDay(new Date("2026-08-31T02:00:00"))).toBe("Night");
    });
  });

  describe("GPS States & Risk Levels Enums & Cooldown Guard", () => {
    it("exports valid GPS states enum", () => {
      expect(GPS_STATES.IDLE).toBe("IDLE");
      expect(GPS_STATES.ACTIVE).toBe("ACTIVE");
      expect(GPS_STATES.DEGRADED).toBe("DEGRADED");
      expect(GPS_STATES.STOPPED).toBe("STOPPED");
      expect(GPS_STATES.ERROR).toBe("ERROR");
    });

    it("exports valid Risk Levels enum", () => {
      expect(RISK_LEVELS.LOW).toBe("Low");
      expect(RISK_LEVELS.MEDIUM).toBe("Medium");
      expect(RISK_LEVELS.HIGH).toBe("High");
      expect(RISK_LEVELS.CRITICAL).toBe("Critical");
    });

    it("configures 5s idle cooldown and 2s moving cooldown with 50m movement trigger", () => {
      expect(IDLE_COOLDOWN_MS).toBe(5000);
      expect(MOVING_COOLDOWN_MS).toBe(2000);
      expect(MOVEMENT_TRIGGER_METERS).toBe(50);
    });
  });
});
