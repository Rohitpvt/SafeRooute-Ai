/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase C: Audio, Speech (TTS) & Haptic Delivery Unit Test Suite
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { AudioHapticService, SPOKEN_MICROCOPY, countWords } from "../services/AudioHapticService.js";

// Real ES6 class mock for AudioContext
class MockAudioContext {
  constructor() {
    this.state = "running";
    this.currentTime = 0;
    this.destination = {};
  }
  resume() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  createOscillator() {
    return {
      type: "sine",
      frequency: { setValueAtTime: vi.fn() },
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
    };
  }
  createGain() {
    return {
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

// Real ES6 class mock for SpeechSynthesisUtterance
class MockSpeechSynthesisUtterance {
  constructor(text) {
    this.text = text;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.onstart = null;
    this.onend = null;
    this.onerror = null;
  }
}

describe("Phase C: AudioHapticService Engine", () => {
  let service;
  let mockSpeechSynthesis;
  let mockVibrate;

  beforeEach(() => {
    service = new AudioHapticService();

    // Mock Web Speech API
    mockSpeechSynthesis = {
      speak: vi.fn().mockImplementation((utterance) => {
        if (utterance && typeof utterance.onstart === "function") {
          utterance.onstart();
        }
      }),
      cancel: vi.fn(),
      pause: vi.fn(),
      resume: vi.fn(),
      speaking: false,
      pending: false,
    };

    mockVibrate = vi.fn();

    // Stub globals
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("speechSynthesis", mockSpeechSynthesis);
    vi.stubGlobal("SpeechSynthesisUtterance", MockSpeechSynthesisUtterance);

    if (typeof window !== "undefined") {
      window.AudioContext = MockAudioContext;
      window.speechSynthesis = mockSpeechSynthesis;
      window.SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    }

    if (typeof navigator !== "undefined") {
      try {
        Object.defineProperty(navigator, "vibrate", {
          value: mockVibrate,
          writable: true,
          configurable: true,
        });
      } catch {}
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // ------------------------------------------------------------------------
  // 1. AUTOMATED TTS WORD-COUNT CONTRACT TESTS
  // ------------------------------------------------------------------------
  describe("Automated TTS Word-Count Contract (<= 8 Words)", () => {
    it("verifies EVERY template in SPOKEN_MICROCOPY has runtime word_count <= 8", () => {
      const realisticAdvisory = 50;
      const realisticDist = 180;

      Object.entries(SPOKEN_MICROCOPY).forEach(([key, template]) => {
        const substituted = template
          .replace("{advisory}", String(realisticAdvisory))
          .replace("{dist}", String(realisticDist));

        const words = countWords(substituted);
        expect(words).toBeLessThanOrEqual(8);
      });
    });

    it("verifies formatSpokenText output for all candidate types is <= 8 words", () => {
      const testAlerts = [
        { message_key: "moderate_overspeed", rule_name: "Moderate Overspeed" },
        { message_key: "severe_overspeed", rule_name: "Severe Overspeed" },
        { message_key: "moderate_curve", distance_m: 250, rule_name: "Moderate Curve" },
        { message_key: "severe_curve", distance_m: 180, rule_name: "Severe Curve" },
        { message_key: "hairpin_turn", distance_m: 120, rule_name: "Hairpin Turn" },
        { message_key: "high_risk_zone", rule_name: "High Risk Zone" },
        { message_key: "critical_risk_zone", distance_m: 300, rule_name: "Critical Risk Zone" },
        { message_key: "adverse_weather", rule_name: "Adverse Weather" },
        { message_key: "gps_low_accuracy", rule_name: "GPS Degraded" },
        { message_key: "gps_loss", rule_name: "GPS Lost" },
        { message_key: "off_route", rule_name: "Off Route" },
      ];

      testAlerts.forEach((alert) => {
        const spoken = service.formatSpokenText(alert, 60);
        expect(countWords(spoken)).toBeLessThanOrEqual(8);
      });
    });
  });

  // ------------------------------------------------------------------------
  // 2. INFO SEVERITY AUDIO POLICY TESTS
  // ------------------------------------------------------------------------
  describe("INFO Severity Audio Policy (Visual Only)", () => {
    beforeEach(() => {
      service.initAudioSession();
    });

    it("INFO severity alert produces ZERO TTS speech", () => {
      const infoAlert = {
        rule_id: "RULE-GPS-01",
        rule_name: "GPS Accuracy Good",
        severity: "INFO",
        event_id: "INFO_GPS",
      };

      service.deliverMultimodalAlert(infoAlert, { nowMs: 1000 });
      expect(mockSpeechSynthesis.speak).not.toHaveBeenCalled();
    });

    it("INFO severity alert produces ZERO haptic vibration", () => {
      service.triggerHaptic("INFO");
      expect(mockVibrate).not.toHaveBeenCalled();
    });
  });

  // ------------------------------------------------------------------------
  // 3. AUDIO INITIALIZATION TESTS
  // ------------------------------------------------------------------------
  describe("Audio Session Initialization", () => {
    it("Initializes audio session on supported browser", () => {
      service.initAudioSession();
      expect(service.isSessionActive).toBe(true);
      expect(service.audioContext).not.toBeNull();
      expect(service.audioContext).toBeInstanceOf(MockAudioContext);
    });

    it("Handles unsupported speech synthesis gracefully without crashing", () => {
      vi.stubGlobal("speechSynthesis", undefined);
      if (typeof window !== "undefined") delete window.speechSynthesis;

      expect(() => service.initAudioSession()).not.toThrow();
      expect(service.isSessionActive).toBe(true);
    });

    it("Handles AudioContext unavailable gracefully without crashing", () => {
      vi.stubGlobal("AudioContext", undefined);
      if (typeof window !== "undefined") delete window.AudioContext;

      expect(() => service.initAudioSession()).not.toThrow();
      expect(service.isSessionActive).toBe(true);
    });
  });

  // ------------------------------------------------------------------------
  // 4. TEXT-TO-SPEECH (TTS) & PRIORITY TESTS
  // ------------------------------------------------------------------------
  describe("Text-To-Speech (TTS) Delivery & Priority", () => {
    beforeEach(() => {
      service.initAudioSession();
    });

    it("Speaks concise microcopy for WARNING alert", () => {
      const alert = {
        rule_id: "RULE-CURVE-02",
        rule_name: "Severe Curve",
        severity: "WARNING",
        message_key: "severe_curve",
        default_text: "Sharp turn ahead in 180 m.",
        distance_m: 180,
        event_id: "CURVE_180",
      };

      service.deliverMultimodalAlert(alert, { nowMs: 1000 });
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });

    it("Duplicate event within 20s deduplication window suppresses repeat speech", () => {
      const alert = {
        rule_id: "RULE-CURVE-02",
        rule_name: "Severe Curve",
        severity: "WARNING",
        message_key: "severe_curve",
        event_id: "CURVE_200",
      };

      service.deliverMultimodalAlert(alert, { nowMs: 1000 });
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);

      // 5 seconds later (within 20s window) -> suppress duplicate speech
      service.deliverMultimodalAlert(alert, { nowMs: 6000 });
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
    });

    it("CRITICAL DRIVER WARNING immediately interrupts ongoing lower-priority speech", () => {
      const warningAlert = {
        rule_id: "RULE-OVERSPEED-02",
        rule_name: "Severe Overspeed",
        severity: "WARNING",
        message_key: "severe_overspeed",
        event_id: "OV_99",
      };

      const criticalAlert = {
        rule_id: "RULE-CURVE-03",
        rule_name: "Hairpin Turn",
        severity: "CRITICAL DRIVER WARNING",
        message_key: "hairpin_turn",
        event_id: "CURVE_99",
      };

      service.deliverMultimodalAlert(warningAlert, { nowMs: 1000 });
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);

      // CRITICAL escalation -> calls window.speechSynthesis.cancel() immediately
      service.deliverMultimodalAlert(criticalAlert, { nowMs: 1500 });
      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(2);
    });
  });

  // ------------------------------------------------------------------------
  // 5. LIFECYCLE & STRESS TESTS
  // ------------------------------------------------------------------------
  describe("Lifecycle Stress & Priority Invariants", () => {
    it("Session stop cancels speech and closes AudioContext cleanly", () => {
      service.initAudioSession();
      service.stopAudioSession();

      expect(mockSpeechSynthesis.cancel).toHaveBeenCalled();
      expect(service.isSessionActive).toBe(false);
      expect(service.audioContext).toBeNull();
    });

    it("Rapid React rerenders with identical active alert produce ZERO duplicate audio calls", () => {
      service.initAudioSession();
      const alert = {
        rule_id: "R1",
        rule_name: "Caution Curve",
        severity: "CAUTION",
        message_key: "moderate_curve",
        event_id: "CURVE_1",
      };

      // Simulating 5 rapid React component rerenders within 100ms
      for (let i = 0; i < 5; i++) {
        service.deliverMultimodalAlert(alert, { nowMs: 1000 + i * 10 });
      }

      expect(mockSpeechSynthesis.speak).toHaveBeenCalledTimes(1);
    });
  });

  // ------------------------------------------------------------------------
  // 6. FORBIDDEN SAFETY PHRASE CHECKS
  // ------------------------------------------------------------------------
  describe("Microcopy Safety Invariants", () => {
    it("Microcopy templates contain zero forbidden guarantee phrases", () => {
      const forbiddenWords = ["you are safe", "emergency avoided", "accident prevented", "guaranteed safe"];
      const allText = Object.values(SPOKEN_MICROCOPY).join(" ").toLowerCase();

      forbiddenWords.forEach((word) => {
        expect(allText.includes(word)).toBe(false);
      });
    });
  });
});
