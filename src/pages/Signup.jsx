import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaLock,
  FaShieldAlt,
  FaArrowRight,
  FaExclamationTriangle,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import FaceRecognition from "../components/FaceRecognition";

export default function Signup() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    password: "",
    confirm_password: "",
  });

  const [faceImage, setFaceImage] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    setError("");

    if (!formData.full_name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    const cleanPhone = formData.phone_number.replace(/\D/g, "");
    if (cleanPhone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (formData.password !== formData.confirm_password) {
      setError("Passwords do not match.");
      return;
    }

    setStep(2);
  };

  const handleFinalSignup = async (imageToEnroll) => {
    const finalImage = imageToEnroll || faceImage;
    if (!finalImage) {
      setError("Please capture or upload a clear photo of your face to complete registration.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await signup({
        full_name: formData.full_name,
        email: formData.email,
        phone_number: formData.phone_number,
        password: formData.password,
        face_image: finalImage,
      });

      navigate("/");
    } catch (err) {
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        "Failed to create account. Please ensure your face is clearly visible."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "540px",
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: "20px",
        padding: "36px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "26px" }}>
        <div
          style={{
            width: "56px",
            height: "56px",
            background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
            color: "#ffffff",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            margin: "0 auto 14px",
            boxShadow: "0 4px 14px rgba(37,99,235,0.3)",
          }}
        >
          <FaShieldAlt />
        </div>
        <h2 style={{ fontSize: "22px", fontWeight: "700", color: "#111827", margin: "0 0 6px" }}>
          Create PayGuard Account
        </h2>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
          {step === 1 ? "Step 1 of 2: Personal & Security Details" : "Step 2 of 2: Biometric Face Enrollment"}
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px" }}>
        <div
          style={{
            flex: 1,
            height: "5px",
            borderRadius: "4px",
            background: "#2563EB",
          }}
        />
        <div
          style={{
            flex: 1,
            height: "5px",
            borderRadius: "4px",
            background: step === 2 ? "#2563EB" : "#E5E7EB",
            transition: "background 0.3s ease",
          }}
        />
      </div>

      {error && (
        <div
          style={{
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            borderRadius: "12px",
            padding: "12px 16px",
            color: "#991B1B",
            fontSize: "14px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FaExclamationTriangle style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {step === 1 ? (
        <form onSubmit={handleStep1Submit}>
          {/* Full Name */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Full Legal Name
            </label>
            <div style={{ position: "relative" }}>
              <FaUser
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                  fontSize: "15px",
                }}
              />
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: "10px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Email / UPI ID */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Email Address (or UPI handle)
            </label>
            <div style={{ position: "relative" }}>
              <FaEnvelope
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                  fontSize: "15px",
                }}
              />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. rahul@payguard.com"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: "10px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Phone Number */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Mobile Number (Linked to Bank / UPI)
            </label>
            <div style={{ position: "relative" }}>
              <FaPhone
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                  fontSize: "15px",
                }}
              />
              <input
                type="tel"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: "10px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: "18px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <FaLock
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                  fontSize: "15px",
                }}
              />
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="At least 6 characters"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: "10px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "#374151",
                marginBottom: "6px",
              }}
            >
              Confirm Password
            </label>
            <div style={{ position: "relative" }}>
              <FaLock
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#9CA3AF",
                  fontSize: "15px",
                }}
              />
              <input
                type="password"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter password"
                required
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 42px",
                  borderRadius: "10px",
                  border: "1px solid #D1D5DB",
                  fontSize: "14px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            style={{
              width: "100%",
              background: "#2563EB",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "14px",
              fontSize: "15px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
            }}
          >
            Continue to Face Recognition <FaArrowRight />
          </button>
        </form>
      ) : (
        /* Reusable Face Recognition Screen in ENROLLMENT Mode */
        <FaceRecognition
          mode="enrollment"
          autoStartCamera={true}
          onCaptureSuccess={(capturedImage) => {
            setFaceImage(capturedImage);
          }}
          onEnrollmentComplete={(capturedImage) => {
            handleFinalSignup(capturedImage || faceImage);
          }}
          onBack={() => {
            setStep(1);
            setFaceImage(null);
          }}
          loading={loading}
          error={error}
        />
      )}

      {/* Footer Link */}
      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "#6B7280" }}>
        Already have an account?{" "}
        <Link to="/login" style={{ color: "#2563EB", fontWeight: "600", textDecoration: "none" }}>
          Log In
        </Link>
      </div>
    </div>
  );
}
