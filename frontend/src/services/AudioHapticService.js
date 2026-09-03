/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase C: Multimodal Audio, Speech (TTS) & Haptic Delivery Service
 *
 * Consumes the Phase B Active Primary Alert and delivers multimodal feedback:
 * 1. Web Audio API Synthetic Chimes (short, non-jarring tones)
 * 2. Web Speech API (window.speechSynthesis) for concise microcopy (MAX <= 8 words)
 * 3. Progressive Haptic Feedback (navigator.vibrate) if available
 *
 * ABSOLUTE PHASE C CONSTRAINTS:
 * - Single source of truth is Phase B activePrimaryAlert (NO arbitration in Phase C).
 * - CRITICAL DRIVER WARNING immediately interrupts lower-priority speech.
 * - Respects 20s event deduplication & 10s non-critical audio cooldown.
 * - INFO severity alerts are VISUAL ONLY by default (no speech/chime distraction).
 * - Every spoken runtime TTS message is strictly guaranteed to be <= 8 words.
 * - All browser API calls fail safely without breaking visual HUD delivery.
 * - Zero LLM calls, zero weather calls, zero backend calls, zero ML changes.
 */

import { SEVERITY_ORDER } from "../utils/alertArbitration.js";
import { getEventIdentityKey } from "../utils/alertIdentity.js";

export const AUDIO_STATES = {
  IDLE: "IDLE",
  CHIME: "CHIME",
  SPEAKING: "SPEAKING",
  COOLDOWN: "COOLDOWN",
  BLOCKED: "BLOCKED",
  UNAVAILABLE: "UNAVAILABLE",
};

/**
 * Microcopy Catalog for Concise Spoken Guidance.
 * STRICT CONTRACT: ALL runtime-generated strings after parameter substitution MUST be <= 8 words.
 */
export const SPOKEN_MICROCOPY = {
  moderate_overspeed: "Moderate overspeed. Advisory {advisory} km/h.", // 5 words
  severe_overspeed: "Reduce speed. Advisory {advisory} kilometers per hour.", // 6 words
  moderate_curve: "Moderate curve ahead in {dist} meters.", // 6 words
  severe_curve: "Sharp turn ahead in {dist} meters.", // 6 words
  hairpin_turn: "Caution: Hairpin turn in {dist} meters.", // 5 words
  high_risk_zone: "High risk zone ahead. Drive cautiously.", // 6 words
  critical_risk_zone: "Critical risk zone in {dist} meters.", // 6 words
  adverse_weather: "Adverse weather. Maintain extra following distance.", // 6 words
  gps_low_accuracy: "Low GPS accuracy. Precision degraded.", // 4 words
  gps_loss: "GPS signal lost. Guidance paused.", // 5 words
  off_route: "Off route. Safety guidance paused.", // 5 words
};

/**
 * Helper to count runtime words in a spoken string.
 * Strips punctuation and splits on whitespace.
 *
 * @param {string} text
 * @returns {number} Exact word count.
 */
export function countWords(text) {
  if (!text || typeof text !== "string") return 0;
  const clean = text.replace(/[^\w\s-]/g, "").trim();
  if (!clean) return 0;
  return clean.split(/\s+/).length;
}

function getAudioContextClass() {
  if (typeof globalThis !== "undefined" && (globalThis.AudioContext || globalThis.webkitAudioContext)) {
    return globalThis.AudioContext || globalThis.webkitAudioContext;
  }
  if (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) {
    return window.AudioContext || window.webkitAudioContext;
  }
  return null;
}

function getSpeechSynthesis() {
  if (typeof globalThis !== "undefined" && globalThis.speechSynthesis) {
    return globalThis.speechSynthesis;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    return window.speechSynthesis;
  }
  return null;
}

function getSpeechUtteranceClass() {
  if (typeof globalThis !== "undefined" && globalThis.SpeechSynthesisUtterance) {
    return globalThis.SpeechSynthesisUtterance;
  }
  if (typeof window !== "undefined" && window.SpeechSynthesisUtterance) {
    return window.SpeechSynthesisUtterance;
  }
  return null;
}

export class AudioHapticService {
  constructor() {
    this.audioContext = null;
    this.audioState = AUDIO_STATES.IDLE;
    this.lastSpokenEventKey = null;
    this.lastSpokenTimestamp = 0;
    this.lastSpokenSeverityRank = 0;
    this.activeUtterance = null;
    this.isSessionActive = false;
  }

  /**
   * Initializes audio capabilities on user gesture / session start.
   */
  initAudioSession() {
    this.isSessionActive = true;

    try {
      const AudioCtxClass = getAudioContextClass();
      if (AudioCtxClass && !this.audioContext) {
        this.audioContext = new AudioCtxClass();
      }
      if (this.audioContext && this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }
      this.audioState = AUDIO_STATES.IDLE;
    } catch {
      this.audioState = AUDIO_STATES.UNAVAILABLE;
    }
  }

  /**
   * Stops active audio/TTS session and cleans up resources.
   */
  stopAudioSession() {
    this.isSessionActive = false;

    // 1. Cancel ongoing TTS speech
    try {
      const synth = getSpeechSynthesis();
      if (synth) {
        synth.cancel();
      }
    } catch {}

    // 2. Close AudioContext
    try {
      if (this.audioContext) {
        this.audioContext.close().catch(() => {});
        this.audioContext = null;
      }
    } catch {}

    this.activeUtterance = null;
    this.lastSpokenEventKey = null;
    this.lastSpokenTimestamp = 0;
    this.lastSpokenSeverityRank = 0;
    this.audioState = AUDIO_STATES.IDLE;
  }

  /**
   * Synthesizes short audio chime tone using Web Audio API.
   *
   * @param {string} severity - "CRITICAL DRIVER WARNING" | "WARNING" | "CAUTION" | "INFO"
   */
  playChime(severity) {
    if (!this.isSessionActive || !this.audioContext || severity === "INFO") return;

    try {
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume().catch(() => {});
      }

      const now = this.audioContext.currentTime || 0;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      if (osc && gain) {
        osc.connect(gain);
        if (this.audioContext.destination) {
          gain.connect(this.audioContext.destination);
        }

        if (severity === "CRITICAL DRIVER WARNING") {
          osc.type = "sawtooth";
          if (osc.frequency?.setValueAtTime) {
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(1046.5, now + 0.15);
          }
          if (gain.gain?.setValueAtTime) {
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
          }
          osc.start?.(now);
          osc.stop?.(now + 0.35);
        } else if (severity === "WARNING") {
          osc.type = "sine";
          if (osc.frequency?.setValueAtTime) {
            osc.frequency.setValueAtTime(587.33, now);
            osc.frequency.setValueAtTime(659.25, now + 0.1);
          }
          if (gain.gain?.setValueAtTime) {
            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
          }
          osc.start?.(now);
          osc.stop?.(now + 0.25);
        } else if (severity === "CAUTION") {
          osc.type = "sine";
          if (osc.frequency?.setValueAtTime) {
            osc.frequency.setValueAtTime(440, now);
          }
          if (gain.gain?.setValueAtTime) {
            gain.gain.setValueAtTime(0.2, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
          }
          osc.start?.(now);
          osc.stop?.(now + 0.2);
        }
      }
    } catch {}
  }

  /**
   * Delivers progressive haptic vibration if supported by device.
   *
   * @param {string} severity
   */
  triggerHaptic(severity) {
    if (severity === "INFO") return;
    const nav = typeof globalThis !== "undefined" ? globalThis.navigator : (typeof window !== "undefined" ? window.navigator : null);
    if (!nav || typeof nav.vibrate !== "function") return;

    try {
      if (severity === "CRITICAL DRIVER WARNING") {
        nav.vibrate([200, 100, 200]);
      } else if (severity === "WARNING") {
        nav.vibrate([150]);
      } else if (severity === "CAUTION") {
        nav.vibrate([50]);
      }
    } catch {}
  }

  /**
   * Formats concise spoken text for TTS engine.
   * STRICT CONTRACT GUARANTEE: Spoken text is ALWAYS <= 8 words.
   *
   * @param {Object} alert - Active Primary Alert object.
   * @param {number} [advisorySpeed=50]
   * @returns {string} Clean, concise spoken string (<= 8 words).
   */
  formatSpokenText(alert, advisorySpeed = 50) {
    if (!alert || typeof alert !== "object") return "";

    const key = alert.message_key;
    const template = SPOKEN_MICROCOPY[key] || alert.default_text || alert.rule_name || "Driver Alert";

    let spoken = template
      .replace("{advisory}", String(advisorySpeed))
      .replace("{dist}", String(Math.round(alert.distance_m || 0)));

    // Strict <= 8 word enforcement check
    if (countWords(spoken) > 8) {
      // Fall back to concise rule name if word count exceeds 8
      spoken = alert.rule_name && countWords(alert.rule_name) <= 8 ? alert.rule_name : "Driver Alert";
    }

    return spoken;
  }

  /**
   * Consumes Phase B Active Primary Alert and delivers multimodal feedback.
   *
   * @param {Object} activePrimaryAlert - Phase B activePrimaryAlert object.
   * @param {Object} [options]
   * @param {number} [options.advisorySpeed=50]
   * @param {boolean} [options.isAudioCooldownActive=false]
   * @param {number} [options.nowMs=Date.now()]
   */
  deliverMultimodalAlert(activePrimaryAlert, options = {}) {
    if (!this.isSessionActive || !activePrimaryAlert || !activePrimaryAlert.rule_id) {
      return;
    }

    const { severity } = activePrimaryAlert;

    // INFO Policy: INFO severity is strictly VISUAL ONLY (prevents driver audio distraction)
    if (severity === "INFO") {
      return;
    }

    const eventKey = getEventIdentityKey(activePrimaryAlert);
    const candidateRank = SEVERITY_ORDER[severity] ?? 1;
    const now = options.nowMs || Date.now();
    const advisorySpeed = options.advisorySpeed || 50;

    // 1. Check for genuine severity escalation interruption
    const isEscalation = candidateRank > this.lastSpokenSeverityRank;

    // 2. Cooldown & Deduplication checks
    const elapsedMs = now - this.lastSpokenTimestamp;
    const isIdenticalEvent = eventKey === this.lastSpokenEventKey;

    if (!isEscalation && isIdenticalEvent && elapsedMs < 20000) {
      // Deduplicate identical event within 20s
      return;
    }

    if (!isEscalation && severity !== "CRITICAL DRIVER WARNING" && options.isAudioCooldownActive) {
      // Respect 10s non-critical audio cooldown
      return;
    }

    // 3. Deliver Audio Chime & Haptics
    this.playChime(severity);
    this.triggerHaptic(severity);

    // 4. Deliver Text-To-Speech (TTS)
    const synth = getSpeechSynthesis();
    const UtteranceClass = getSpeechUtteranceClass();

    if (!synth || !UtteranceClass) {
      return;
    }

    try {
      // If critical escalation occurs, interrupt any ongoing speech immediately
      if (isEscalation && severity === "CRITICAL DRIVER WARNING") {
        synth.cancel();
      }

      const spokenText = this.formatSpokenText(activePrimaryAlert, advisorySpeed);
      if (!spokenText) return;

      const utterance = new UtteranceClass(spokenText);
      utterance.rate = 1.05;
      utterance.pitch = severity === "CRITICAL DRIVER WARNING" ? 1.1 : 1.0;
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.audioState = AUDIO_STATES.SPEAKING;
      };
      utterance.onend = () => {
        this.audioState = AUDIO_STATES.IDLE;
        this.activeUtterance = null;
      };
      utterance.onerror = () => {
        this.audioState = AUDIO_STATES.IDLE;
        this.activeUtterance = null;
      };

      this.activeUtterance = utterance;
      this.lastSpokenEventKey = eventKey;
      this.lastSpokenTimestamp = now;
      this.lastSpokenSeverityRank = candidateRank;

      synth.speak(utterance);
    } catch {
      this.audioState = AUDIO_STATES.BLOCKED;
    }
  }
}

export const audioHapticService = new AudioHapticService();
