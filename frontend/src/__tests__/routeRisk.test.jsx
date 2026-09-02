import { describe, it, expect } from "vitest";
import {
  getRiskCategoryAndColor,
  calculateDistanceWeightedRouteRisk,
  RISK_COLORS,
  RISK_CATEGORIES,
} from "../services/routeRiskService";

describe("Route Risk Intelligence Engine Unit Tests", () => {
  describe("Risk Color & Category Classification", () => {
    it("maps 0-25 risk scores to LOW risk tier (#10B981)", () => {
      const res0 = getRiskCategoryAndColor(0);
      expect(res0.category).toBe(RISK_CATEGORIES.LOW);
      expect(res0.color).toBe(RISK_COLORS.LOW);

      const res25 = getRiskCategoryAndColor(25);
      expect(res25.category).toBe(RISK_CATEGORIES.LOW);
      expect(res25.color).toBe(RISK_COLORS.LOW);
    });

    it("maps 26-50 risk scores to MEDIUM risk tier (#F59E0B)", () => {
      const res26 = getRiskCategoryAndColor(26);
      expect(res26.category).toBe(RISK_CATEGORIES.MEDIUM);
      expect(res26.color).toBe(RISK_COLORS.MEDIUM);

      const res50 = getRiskCategoryAndColor(50);
      expect(res50.category).toBe(RISK_CATEGORIES.MEDIUM);
      expect(res50.color).toBe(RISK_COLORS.MEDIUM);
    });

    it("maps 51-75 risk scores to HIGH risk tier (#F97316)", () => {
      const res51 = getRiskCategoryAndColor(51);
      expect(res51.category).toBe(RISK_CATEGORIES.HIGH);
      expect(res51.color).toBe(RISK_COLORS.HIGH);

      const res75 = getRiskCategoryAndColor(75);
      expect(res75.category).toBe(RISK_CATEGORIES.HIGH);
      expect(res75.color).toBe(RISK_COLORS.HIGH);
    });

    it("maps 76-100 risk scores to CRITICAL risk tier (#EF4444)", () => {
      const res76 = getRiskCategoryAndColor(76);
      expect(res76.category).toBe(RISK_CATEGORIES.CRITICAL);
      expect(res76.color).toBe(RISK_COLORS.CRITICAL);

      const res100 = getRiskCategoryAndColor(100);
      expect(res100.category).toBe(RISK_CATEGORIES.CRITICAL);
      expect(res100.color).toBe(RISK_COLORS.CRITICAL);
    });

    it("maps null, undefined, or NaN to UNAVAILABLE tier (#64748B)", () => {
      const resNull = getRiskCategoryAndColor(null);
      expect(resNull.category).toBe(RISK_CATEGORIES.UNAVAILABLE);
      expect(resNull.color).toBe(RISK_COLORS.UNAVAILABLE);

      const resUndef = getRiskCategoryAndColor(undefined);
      expect(resUndef.category).toBe(RISK_CATEGORIES.UNAVAILABLE);

      const resNaN = getRiskCategoryAndColor(NaN);
      expect(resNaN.category).toBe(RISK_CATEGORIES.UNAVAILABLE);
    });
  });

  describe("Distance-Weighted Route Risk Aggregation Math", () => {
    it("calculates exact distance-weighted risk for deterministic case (1000m x 20 + 500m x 80 = 40)", () => {
      const segments = [
        { segment_id: "seg_1", distance_m: 1000, risk_score: 20 },
        { segment_id: "seg_2", distance_m: 500, risk_score: 80 },
      ];

      const summary = calculateDistanceWeightedRouteRisk(segments);

      // (1000 * 20 + 500 * 80) / (1000 + 500) = (20000 + 40000) / 1500 = 60000 / 1500 = 40
      expect(summary.weightedRiskScore).toBe(40);
      expect(summary.overallCategory).toBe(RISK_CATEGORIES.MEDIUM);
      expect(summary.highestSegmentRisk).toBe(80);
      expect(summary.highRiskCount).toBe(0);
      expect(summary.criticalRiskCount).toBe(1);
      expect(summary.totalDistanceM).toBe(1500);
      expect(summary.evaluatedDistanceM).toBe(1500);
    });

    it("evaluates all low risk route correctly", () => {
      const segments = [
        { segment_id: "s1", distance_m: 800, risk_score: 10 },
        { segment_id: "s2", distance_m: 1200, risk_score: 15 },
      ];

      const summary = calculateDistanceWeightedRouteRisk(segments);
      // (800*10 + 1200*15) / 2000 = (8000 + 18000) / 2000 = 26000 / 2000 = 13
      expect(summary.weightedRiskScore).toBe(13);
      expect(summary.overallCategory).toBe(RISK_CATEGORIES.LOW);
      expect(summary.highRiskCount).toBe(0);
      expect(summary.criticalRiskCount).toBe(0);
    });

    it("evaluates all critical risk route correctly", () => {
      const segments = [
        { segment_id: "s1", distance_m: 1000, risk_score: 85 },
        { segment_id: "s2", distance_m: 1000, risk_score: 95 },
      ];

      const summary = calculateDistanceWeightedRouteRisk(segments);
      // (1000*85 + 1000*95) / 2000 = 180000 / 2000 = 90
      expect(summary.weightedRiskScore).toBe(90);
      expect(summary.overallCategory).toBe(RISK_CATEGORIES.CRITICAL);
      expect(summary.criticalRiskCount).toBe(2);
    });

    it("correctly weights short critical segment vs long low-risk segment", () => {
      const segments = [
        { segment_id: "s1", distance_m: 9000, risk_score: 10 }, // 9km low
        { segment_id: "s2", distance_m: 1000, risk_score: 90 }, // 1km critical
      ];

      const summary = calculateDistanceWeightedRouteRisk(segments);
      // (9000*10 + 1000*90) / 10000 = (90000 + 90000) / 10000 = 18
      expect(summary.weightedRiskScore).toBe(18); // Overall Low because 90% distance is low risk!
      expect(summary.overallCategory).toBe(RISK_CATEGORIES.LOW);
      expect(summary.highestSegmentRisk).toBe(90);
      expect(summary.criticalRiskCount).toBe(1);
    });

    it("handles partial evaluation failures with null risk scores gracefully", () => {
      const segments = [
        { segment_id: "s1", distance_m: 1000, risk_score: 40 },
        { segment_id: "s2", distance_m: 1000, risk_score: null }, // Failed prediction
      ];

      const summary = calculateDistanceWeightedRouteRisk(segments);
      // Only evaluated segment s1 is included in weighted average
      expect(summary.weightedRiskScore).toBe(40);
      expect(summary.overallCategory).toBe(RISK_CATEGORIES.MEDIUM);
      expect(summary.evaluatedDistanceM).toBe(1000);
      expect(summary.totalDistanceM).toBe(2000);
    });

    it("handles zero evaluated segments safely without division by zero", () => {
      const segments = [
        { segment_id: "s1", distance_m: 500, risk_score: null },
      ];

      const summary = calculateDistanceWeightedRouteRisk(segments);
      expect(summary.weightedRiskScore).toBeNull();
      expect(summary.overallCategory).toBe(RISK_CATEGORIES.UNAVAILABLE);
      expect(summary.evaluatedDistanceM).toBe(0);
      expect(summary.totalDistanceM).toBe(500);
    });
  });
});
