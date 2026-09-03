/**
 * SafeRoute AI — Real-Time Driver Safety Assistant
 * Phase C: Multimodal Delivery Custom Hook
 *
 * Connects Phase B Active Primary Alert updates to AudioHapticService seamlessly:
 * - Listens for activePrimaryAlert state changes from useAlertOrchestrator.
 * - Manages session audio lifecycle on Start/Stop Live Driver Mode.
 * - Zero side effects when audio is unsupported or muted.
 */

import { useEffect, useRef } from "react";
import { audioHapticService } from "../services/AudioHapticService.js";

/**
 * Custom React hook for driving session multimodal delivery.
 *
 * @param {Object} params
 * @param {Object|null} params.activePrimaryAlert - Phase B Active Primary Alert.
 * @param {boolean} params.isLiveDriverMode - True when live driver mode is active.
 * @param {number} [params.advisorySpeed=50] - Conservative advisory speed limit.
 * @param {boolean} [params.isAudioCooldownActive=false] - True if 10s audio cooldown active.
 */
export function useMultimodalDelivery({
  activePrimaryAlert,
  isLiveDriverMode,
  advisorySpeed = 50,
  isAudioCooldownActive = false,
}) {
  const previousAlertIdRef = useRef(null);

  // 1. Session Lifecycle Initialization & Cleanup
  useEffect(() => {
    if (isLiveDriverMode) {
      audioHapticService.initAudioSession();
    } else {
      audioHapticService.stopAudioSession();
      previousAlertIdRef.current = null;
    }

    return () => {
      audioHapticService.stopAudioSession();
    };
  }, [isLiveDriverMode]);

  // 2. Deliver Multimodal Feedback on Active Primary Alert Update
  useEffect(() => {
    if (!isLiveDriverMode || !activePrimaryAlert) return;

    audioHapticService.deliverMultimodalAlert(activePrimaryAlert, {
      advisorySpeed,
      isAudioCooldownActive,
      nowMs: Date.now(),
    });

    previousAlertIdRef.current = activePrimaryAlert.event_id || activePrimaryAlert.rule_id;
  }, [activePrimaryAlert, isLiveDriverMode, advisorySpeed, isAudioCooldownActive]);
}
