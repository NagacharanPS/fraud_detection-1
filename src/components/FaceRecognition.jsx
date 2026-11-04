import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  FaCamera,
  FaCheckCircle,
  FaTimesCircle,
  FaShieldAlt,
  FaFingerprint,
  FaUserShield,
  FaRedoAlt,
  FaUpload,
  FaSpinner,
  FaArrowLeft,
  FaExclamationTriangle,
  FaLock,
  FaTimes,
} from "react-icons/fa";
import API from "../api";
import { useAuth } from "../context/AuthContext";

/**
 * Reusable Face Recognition Component for UPI PayGuard
 * Supports:
 * - mode="enrollment": Used during user signup to capture, validate, and register face embeddings.
 * - mode="verification": Used during HIGH-RISK transactions to compare the live face against the stored database embedding.
 */
export default function FaceRecognition({
  mode = "enrollment", // "enrollment" | "verification"
  targetAccount = null, // senderAccount or user object or accountId string (for verification)
  amount = null, // transaction amount (for verification display)
  onVerified = null, // (result) => void (called upon successful face match)
  onCaptureSuccess = null, // (dataUrl) => void (called when face is captured/uploaded and validated)
  onEnrollmentComplete = null, // (dataUrl) => void (called to finalize signup)
  onBack = null, // () => void (signup back button)
  onClose = null, // () => void (modal or cancellation close)
  asModal = false, // if true, renders with modal overlay backdrop
  autoStartCamera = false, // whether to start camera immediately on mount
  loading = false, // external loading state (e.g. signup in progress)
  error = "", // external error message
  onSwitchToOtp = null, // optional fallback to OTP verification
}) {
  const { user: authUser } = useAuth();

  // Internal states
  const [faceImage, setFaceImage] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [capturing, setCapturing] = useState(false);
  const [detectedBox, setDetectedBox] = useState(null);
  const [internalError, setInternalError] = useState("");

  // Verification-specific states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStep, setVerificationStep] = useState(0); // 0: Idle, 1: Aligning, 2: Matching SFace Vector, 3: Completed
  const [verificationResult, setVerificationResult] = useState(null);
  const [verificationFailed, setVerificationFailed] = useState(false);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  const displayError = error || internalError;

  // Cleanup media tracks safely
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setIsCameraLoading(false);
  }, []);

  // Start Camera
  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError("");
    setInternalError("");
    setVerificationFailed(false);
    setIsCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraLoading(false);
      setCameraError("Webcam is not supported on this browser or platform.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraActive(true);
      setIsCameraLoading(false);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err) {
      console.warn("[FaceRecognition] Camera access error:", err);
      setIsCameraLoading(false);
      setCameraActive(false);
      setCameraError(
        "Camera access denied or no webcam detected. Please allow camera permissions or upload a photo below."
      );
    }
  }, [stopCamera]);

  // Sync stream to video element when active
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      if (videoRef.current.srcObject !== streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  // Auto-start camera if requested or in verification mode
  useEffect(() => {
    if (autoStartCamera || mode === "verification") {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [autoStartCamera, mode, startCamera, stopCamera]);

  // Capture current frame from video stream
  const captureFrameFromVideo = () => {
    if (!videoRef.current) return null;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // Flip horizontally to match mirror preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.92);
  };

  // Handle Enrollment Capture & Validation
  const handleEnrollmentCapture = async (dataUrl) => {
    setCapturing(true);
    setInternalError("");
    setDetectedBox(null);

    try {
      const detectRes = await API.post("/api/auth/detect-face", { face_image: dataUrl });
      if (!detectRes.data || !detectRes.data.detected) {
        setInternalError(
          detectRes.data?.error || "No clear face detected. Please face the camera directly in good lighting."
        );
        setCapturing(false);
        return;
      }

      setDetectedBox(detectRes.data.bounding_box || null);
      setFaceImage(dataUrl);
      stopCamera();

      if (onCaptureSuccess) {
        onCaptureSuccess(dataUrl);
      }
    } catch (err) {
      console.warn("[FaceRecognition] Face validation error:", err);
      setInternalError(
        err.response?.data?.error || "Could not detect a clear face in the image. Please try again."
      );
    } finally {
      setCapturing(false);
    }
  };

  // Handle Verification Capture & Comparison
  const handleVerificationCompare = async (dataUrl) => {
    setIsVerifying(true);
    setVerificationStep(1);
    setInternalError("");
    setVerificationFailed(false);
    setDetectedBox(null);

    // Step 1: Aligning face
    await new Promise((r) => setTimeout(r, 400));
    setVerificationStep(2); // Matching 128-D OpenCV SFace vector

    const activeUser = targetAccount || authUser;
    const accountId =
      typeof activeUser === "string"
        ? activeUser
        : activeUser?.account_id || activeUser?.user_id || activeUser?.id;

    try {
      const res = await API.post("/api/auth/verify-face", {
        face_image: dataUrl,
        account_id: accountId,
        user_id: activeUser?.user_id,
      });

      setVerificationStep(3);

      if (res.data?.verified) {
        setVerificationResult(res.data);
        setVerificationFailed(false);
        setFaceImage(dataUrl);
        setDetectedBox(res.data.bounding_box || null);
        stopCamera();

        if (onVerified) {
          onVerified(res.data);
        }
      } else {
        setVerificationFailed(true);
        setVerificationResult(null);
        setInternalError(
          res.data?.error ||
          res.data?.message ||
          "FACE VERIFICATION FAILED: Face did not match the registered account holder record."
        );
      }
    } catch (err) {
      console.warn("[FaceRecognition] Verification request error:", err);
      setVerificationFailed(true);
      setVerificationResult(null);
      setInternalError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        "Biometric verification service failed. Please retry."
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Primary Action Trigger (Capture button)
  const handlePrimaryCapture = () => {
    const frame = captureFrameFromVideo();
    if (!frame) {
      setInternalError("Could not capture frame from webcam. Please retry.");
      return;
    }
    if (mode === "verification") {
      handleVerificationCompare(frame);
    } else {
      handleEnrollmentCapture(frame);
    }
  };

  // Handle File Upload Fallback
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setInternalError("Please select a valid image file (PNG, JPG, JPEG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (mode === "verification") {
        handleVerificationCompare(dataUrl);
      } else {
        handleEnrollmentCapture(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Retake or Retry
  const handleRetake = () => {
    setFaceImage(null);
    setDetectedBox(null);
    setVerificationResult(null);
    setVerificationFailed(false);
    setInternalError("");
    setVerificationStep(0);
    startCamera();
  };

  // Main UI Content
  const content = (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "28px 24px",
        maxWidth: "520px",
        width: "100%",
        margin: "0 auto",
        boxShadow: asModal ? "0 20px 40px rgba(0,0,0,0.2)" : "none",
        position: "relative",
      }}
    >
      {/* Top Close Button (for modal mode) */}
      {(asModal || onClose) && (
        <button
          type="button"
          onClick={() => {
            stopCamera();
            if (onClose) onClose();
          }}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            background: "#F1F5F9",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748B",
            cursor: "pointer",
            fontSize: "14px",
            zIndex: 10,
          }}
        >
          <FaTimes />
        </button>
      )}

      {/* Header Banner */}
      <div style={{ textAlign: "center", marginBottom: "20px" }}>
        <div
          style={{
            width: "52px",
            height: "52px",
            background:
              mode === "verification"
                ? "linear-gradient(135deg, #1E40AF, #2563EB)"
                : "linear-gradient(135deg, #2563EB, #1D4ED8)",
            color: "#ffffff",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            margin: "0 auto 10px",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          }}
        >
          {mode === "verification" ? <FaUserShield /> : <FaFingerprint />}
        </div>

        <div style={{ display: "inline-block", marginBottom: "6px" }}>
          <span
            style={{
              background: mode === "verification" ? "#FEF3C7" : "#EFF6FF",
              color: mode === "verification" ? "#B45309" : "#2563EB",
              fontSize: "11px",
              fontWeight: "700",
              padding: "3px 9px",
              borderRadius: "6px",
              letterSpacing: "0.5px",
            }}
          >
            {mode === "verification" ? "VERIFICATION MODE: HIGH-RISK" : "ENROLLMENT MODE: REGISTRATION"}
          </span>
        </div>

        <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#0F172A", margin: "0 0 6px" }}>
          {mode === "verification" ? "Biometric Face Verification" : "Biometric Face Enrollment"}
        </h3>
        <p style={{ fontSize: "13px", color: "#64748B", margin: 0, lineHeight: "1.4" }}>
          {mode === "verification"
            ? `Verify your face to authorize this high-risk transaction${amount ? ` of ₹${Number(amount).toLocaleString("en-IN")}` : ""}.`
            : "Capture or upload a clear photo to register your facial biometric template."}
        </p>
      </div>

      {/* Hidden File Upload Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        style={{ display: "none" }}
      />

      {/* Warning / Error Notices */}
      {cameraError && !faceImage && (
        <div
          style={{
            background: "#FEF3C7",
            border: "1px solid #FDE68A",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#92400E",
            fontSize: "12px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaExclamationTriangle style={{ flexShrink: 0 }} />
          <span>{cameraError}</span>
        </div>
      )}

      {displayError && (
        <div
          style={{
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            borderRadius: "10px",
            padding: "10px 14px",
            color: "#991B1B",
            fontSize: "12px",
            marginBottom: "14px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaExclamationTriangle style={{ flexShrink: 0 }} />
          <span>{displayError}</span>
        </div>
      )}

      {/* Reused Camera / Face Preview Shell */}
      <div
        style={{
          background: "#F8FAFC",
          border: verificationResult
            ? "2px solid #10B981"
            : verificationFailed
            ? "2px solid #EF4444"
            : faceImage
            ? "2px solid #10B981"
            : "2px dashed #CBD5E1",
          borderRadius: "16px",
          padding: "20px 16px",
          textAlign: "center",
          marginBottom: "18px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Verification Success Overlay Banner */}
        {verificationResult && (
          <div
            style={{
              background: "#F0FDF4",
              border: "1px solid #86EFAC",
              borderRadius: "10px",
              padding: "12px 14px",
              marginBottom: "14px",
              textAlign: "left",
            }}
          >
            <div style={{ fontSize: "11px", fontWeight: "800", color: "#166534", marginBottom: "2px" }}>
              ✓ ACCOUNT HOLDER IDENTITY VERIFIED
            </div>
            <div style={{ fontSize: "15px", fontWeight: "800", color: "#0F172A" }}>
              {verificationResult.user?.full_name}
            </div>
            <div style={{ fontSize: "12px", color: "#475569", marginTop: "2px" }}>
              Account: <strong>{verificationResult.user?.account_id}</strong> • Match Confidence:{" "}
              <strong>{verificationResult.match_score}%</strong>
            </div>
          </div>
        )}

        {/* 1. Captured Photo Preview (Enrollment or Verification Result) */}
        {faceImage ? (
          <div>
            <div style={{ position: "relative", width: "190px", height: "190px", margin: "0 auto 12px" }}>
              <img
                src={faceImage}
                alt="Captured Face"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                  border: verificationFailed ? "4px solid #EF4444" : "4px solid #10B981",
                  boxShadow: verificationFailed
                    ? "0 4px 14px rgba(239,68,68,0.3)"
                    : "0 4px 14px rgba(16,185,129,0.3)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: "4px",
                  right: "4px",
                  background: verificationFailed ? "#EF4444" : "#10B981",
                  color: "#FFFFFF",
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  border: "2px solid #FFFFFF",
                }}
              >
                {verificationFailed ? <FaTimesCircle /> : <FaCheckCircle />}
              </div>
            </div>

            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                background: verificationFailed ? "#FEE2E2" : "#DCFCE7",
                color: verificationFailed ? "#991B1B" : "#15803D",
                padding: "6px 14px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: "700",
                marginBottom: "12px",
              }}
            >
              {verificationFailed ? (
                <>
                  <FaTimesCircle /> Face Verification Failed
                </>
              ) : (
                <>
                  <FaCheckCircle /> Face Captured &amp; Validated
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handleRetake}
                style={{
                  background: "#F1F5F9",
                  color: "#334155",
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "8px 14px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaRedoAlt /> Retake Face Photo
              </button>
            </div>
          </div>
        ) : isCameraLoading ? (
          /* 2. Camera Initializing Loader */
          <div
            style={{
              height: "210px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#2563EB",
            }}
          >
            <FaSpinner className="animate-spin" style={{ fontSize: "36px", marginBottom: "10px" }} />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#475569" }}>
              Initializing Camera Feed...
            </span>
          </div>
        ) : cameraActive ? (
          /* 3. Live Webcam Circular Preview */
          <div>
            <div
              style={{
                position: "relative",
                width: "210px",
                height: "210px",
                margin: "0 auto 14px",
                borderRadius: "50%",
                overflow: "hidden",
                border: "4px solid #2563EB",
                boxShadow: "0 0 20px rgba(37,99,235,0.35)",
                background: "#0F172A",
              }}
            >
              <video
                ref={(el) => {
                  videoRef.current = el;
                  if (el && streamRef.current && el.srcObject !== streamRef.current) {
                    el.srcObject = streamRef.current;
                    el.play().catch(() => {});
                  }
                }}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)", // Mirror selfie preview
                }}
              />

              {/* Face Positioning Guide Reticle */}
              <div
                style={{
                  position: "absolute",
                  inset: "14px",
                  borderRadius: "50%",
                  border: "2px dashed rgba(255,255,255,0.75)",
                  pointerEvents: "none",
                }}
              />

              {/* Active Verification Scanning Laser */}
              {isVerifying && (
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "linear-gradient(90deg, transparent 0%, #60A5FA 50%, transparent 100%)",
                    boxShadow: "0 0 12px #3B82F6",
                    top: verificationStep === 1 ? "30%" : "65%",
                    transition: "top 0.4s ease-in-out",
                    zIndex: 10,
                  }}
                />
              )}
            </div>

            <p style={{ margin: "0 0 12px", color: "#475569", fontSize: "12px", fontWeight: "500" }}>
              {mode === "verification"
                ? "Position your face in the circle and click Verify Face."
                : "Position your face clearly inside the circle and click Capture."}
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button
                type="button"
                onClick={handlePrimaryCapture}
                disabled={capturing || isVerifying}
                style={{
                  background: mode === "verification" ? "#2563EB" : "#2563EB",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 20px",
                  fontSize: "13px",
                  fontWeight: "700",
                  cursor: capturing || isVerifying ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
                }}
              >
                {capturing || isVerifying ? (
                  <>
                    <FaSpinner className="animate-spin" />
                    {isVerifying ? "Comparing Biometrics..." : "Validating Face..."}
                  </>
                ) : (
                  <>
                    <FaCamera /> {mode === "verification" ? "Verify Face" : "Capture Face"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={stopCamera}
                style={{
                  background: "#F1F5F9",
                  color: "#475569",
                  border: "1px solid #CBD5E1",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Pause Camera
              </button>
            </div>
          </div>
        ) : (
          /* 4. Ready / Camera Stopped View */
          <div style={{ padding: "14px 10px" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "50%",
                background: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                margin: "0 auto 12px",
              }}
            >
              {mode === "verification" ? <FaUserShield /> : <FaFingerprint />}
            </div>
            <h4 style={{ margin: "0 0 6px", color: "#1E293B", fontSize: "15px" }}>
              {mode === "verification" ? "Biometric Verification Ready" : "Biometric Face Enrollment"}
            </h4>
            <p style={{ margin: "0 0 16px", color: "#64748B", fontSize: "12px", lineHeight: "1.5" }}>
              {mode === "verification"
                ? "Start the camera or upload a photo to verify your registered face for this high-risk transaction."
                : "Capture or upload a clear, front-facing photo to register your facial biometric template."}
            </p>

            <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={startCamera}
                style={{
                  background: "#2563EB",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
                }}
              >
                <FaCamera /> Open Camera
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  background: "#FFFFFF",
                  color: "#334155",
                  border: "1px solid #CBD5E1",
                  borderRadius: "10px",
                  padding: "10px 18px",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaUpload /> Upload Photo File
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Optional fallback to OTP (for verification mode) */}
      {mode === "verification" && onSwitchToOtp && (
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onSwitchToOtp();
            }}
            style={{
              border: "none",
              background: "transparent",
              color: "#4F46E5",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Unable to scan face? Verify with SMS OTP instead
          </button>
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div style={{ display: "flex", gap: "12px" }}>
        {/* Enrollment Back Button */}
        {mode === "enrollment" && onBack && (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onBack();
            }}
            style={{
              flex: "0 0 90px",
              background: "#F1F5F9",
              color: "#475569",
              border: "1px solid #CBD5E1",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
            }}
          >
            <FaArrowLeft /> Back
          </button>
        )}

        {/* Verification Cancel / Close Button */}
        {mode === "verification" && onClose && (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            style={{
              flex: 1,
              background: "#F1F5F9",
              color: "#475569",
              border: "1px solid #CBD5E1",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        )}

        {/* Enrollment Final Submission Button */}
        {mode === "enrollment" && (
          <button
            type="button"
            onClick={() => {
              if (onEnrollmentComplete) {
                onEnrollmentComplete(faceImage);
              }
            }}
            disabled={loading || !faceImage}
            style={{
              flex: 1,
              background: faceImage ? "#10B981" : "#9CA3AF",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "600",
              cursor: faceImage && !loading ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: faceImage ? "0 4px 12px rgba(16,185,129,0.25)" : "none",
            }}
          >
            {loading ? (
              <>
                <FaSpinner className="animate-spin" /> Registering Biometrics...
              </>
            ) : (
              <>
                <FaCheckCircle /> Complete Registration &amp; Enroll Face
              </>
            )}
          </button>
        )}

        {/* Verification Finalize / Proceed Button */}
        {mode === "verification" && verificationResult && (
          <button
            type="button"
            onClick={() => {
              stopCamera();
              if (onVerified) onVerified(verificationResult);
            }}
            style={{
              flex: 2,
              background: "#10B981",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "12px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
            }}
          >
            <FaCheckCircle /> Authorize &amp; Complete Payment
          </button>
        )}
      </div>
    </div>
  );

  // If asModal is true, wrap in full-screen blurred backdrop
  if (asModal) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15, 23, 42, 0.75)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
      >
        {content}
      </div>
    );
  }

  return content;
}
