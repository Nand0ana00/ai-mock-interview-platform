import React, { useEffect, useRef, useState } from 'react';
import { Camera, Eye, AlertTriangle, CheckCircle2, UserX } from 'lucide-react';
import { FaceMesh } from '@mediapipe/face_mesh';
import { Camera as MediaPipeCamera } from '@mediapipe/camera_utils';

export default function VisionTracker({ onMetricsUpdate }) {
  const videoRef = useRef(null);
  const [postureAlert, setPostureAlert] = useState(null);
  const [eyeContactPct, setEyeContactPct] = useState(100);
  const [isFaceDetected, setIsFaceDetected] = useState(true);

  // Tracking metrics accumulated across the session
  const metricsRef = useRef({
    totalFrames: 0,
    eyeContactFrames: 0,
    slouchFrames: 0,
    fidgetEvents: 0,
    lastYaw: 0,
    lastPitch: 0,
    calibratedNoseY: null
  });

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const faceMesh = new FaceMesh({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    faceMesh.onResults((results) => {
      const metrics = metricsRef.current;
      metrics.totalFrames += 1;

      if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
        setIsFaceDetected(false);
        setPostureAlert("No face detected in frame. Please adjust your camera.");
        return;
      }

      setIsFaceDetected(true);
      const landmarks = results.multiFaceLandmarks[0];

      // Key landmark indices
      // Nose tip: 1, Chin: 152, Left iris: 468, Right iris: 473
      // Left eye outer: 33, Left eye inner: 133, Right eye inner: 362, Right eye outer: 263
      const noseTip = landmarks[1];
      const leftIris = landmarks[468];
      const rightIris = landmarks[473];
      const leftEyeOuter = landmarks[33];
      const leftEyeInner = landmarks[133];

      // 1. Calibration on initial valid frames
      if (metrics.calibratedNoseY === null && metrics.totalFrames > 15) {
        metrics.calibratedNoseY = noseTip.y;
      }

      // 2. Eye Contact Estimation (relative iris position within eye corners)
      let isLookingAtScreen = true;
      if (leftIris && leftEyeOuter && leftEyeInner) {
        const eyeWidth = Math.abs(leftEyeInner.x - leftEyeOuter.x);
        const irisRelativePos = (leftIris.x - Math.min(leftEyeOuter.x, leftEyeInner.x)) / (eyeWidth || 0.001);

        // Center range is typically between 0.35 and 0.65
        if (irisRelativePos < 0.28 || irisRelativePos > 0.72) {
          isLookingAtScreen = false;
        }
      }

      if (isLookingAtScreen) {
        metrics.eyeContactFrames += 1;
      }

      const currentEyeScore = Math.round((metrics.eyeContactFrames / metrics.totalFrames) * 100);
      setEyeContactPct(currentEyeScore);

      // 3. Posture & Slouch Detection (relative downward drift of nose tip)
      let alertMsg = null;
      if (metrics.calibratedNoseY !== null) {
        const drift = noseTip.y - metrics.calibratedNoseY;
        if (drift > 0.12) {
          metrics.slouchFrames += 1;
          alertMsg = "Slouching detected. Please maintain an upright posture.";
        }
      }

      // 4. Head Pose & Fidget Tracking (delta yaw / pitch)
      const deltaYaw = Math.abs(noseTip.x - metrics.lastYaw);
      const deltaPitch = Math.abs(noseTip.y - metrics.lastPitch);
      if (deltaYaw > 0.07 || deltaPitch > 0.07) {
        metrics.fidgetEvents += 1;
      }
      metrics.lastYaw = noseTip.x;
      metrics.lastPitch = noseTip.y;

      setPostureAlert(alertMsg);

      // Transmit latest aggregated metrics every 30 frames (~2 seconds)
      if (metrics.totalFrames % 30 === 0 && onMetricsUpdate) {
        const slouchPct = Math.round((metrics.slouchFrames / metrics.totalFrames) * 100);
        onMetricsUpdate({
          eye_contact_percentage: currentEyeScore,
          slouch_percentage: slouchPct,
          fidget_event_count: metrics.fidgetEvents,
          composure_rating: currentEyeScore > 70 && slouchPct < 20 ? 'Strong' : 'Needs Focus'
        });
      }
    });

    const camera = new MediaPipeCamera(videoElement, {
      onFrame: async () => {
        await faceMesh.send({ image: videoElement });
      },
      width: 320,
      height: 240
    });

    camera.start();

    return () => {
      try {
        camera.stop();
        faceMesh.close();
      } catch (e) {}
    };
  }, []);

  return (
    <div className="relative group w-44 h-32 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover transform -scale-x-100"
      />

      {/* Floating Eye-Contact Badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700 text-[10px] font-medium text-slate-200">
        <Eye className={`w-3 h-3 ${eyeContactPct > 65 ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span>Eye Contact: {eyeContactPct}%</span>
      </div>

      {/* Non-intrusive Posture Warning Overlay */}
      {postureAlert && (
        <div className="absolute inset-x-2 bottom-2 p-1.5 rounded-lg bg-rose-500/90 text-white text-[9px] font-semibold flex items-center gap-1 shadow-md animate-bounce">
          <AlertTriangle className="w-3 h-3 shrink-0" />
          <span className="truncate">{postureAlert}</span>
        </div>
      )}

      {!isFaceDetected && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-2 text-center text-slate-400">
          <UserX className="w-6 h-6 text-rose-400 mb-1" />
          <span className="text-[10px]">Candidate Out of Frame</span>
        </div>
      )}
    </div>
  );
}