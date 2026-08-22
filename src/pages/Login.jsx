import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaLock,
  FaEnvelope,
  FaShieldAlt,
  FaArrowRight,
  FaExclamationTriangle,
  FaSyncAlt,
  FaUserCheck,
  FaCheckCircle,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import API from "../api";

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState([]);

  useEffect(() => {
    async function loadDemoUsers() {
      try {
        const res = await API.get("/api/auth/demo-users");
        if (res.data && Array.isArray(res.data)) {
          setDemoUsers(res.data);
        }
      } catch (err) {
        console.error("Could not fetch demo users:", err);
      }
    }
    loadDemoUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(emailOrPhone, password);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoUser) => {
    setEmailOrPhone(demoUser.email);
    setPassword(demoUser.demo_password);
    setError("");
  };

  return (
    <div
      style={{
        maxWidth: "500px",
        margin: "0 auto",
        background: "#ffffff",
        borderRadius: "20px",
        padding: "36px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        border: "1px solid #E5E7EB",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "28px" }}>
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
          Login to PayGuard
        </h2>
        <p style={{ fontSize: "14px", color: "#6B7280", margin: 0 }}>
          Access your secure UPI account & biometric protection
        </p>
      </div>

      {error && (
        <div
          style={{
            background: "#FEE2E2",
            border: "1px solid #FCA5A5",
            borderRadius: "12px",
            padding: "12px 16px",
            color: "#991B1B",
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <FaExclamationTriangle style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Email or Phone */}
        <div style={{ marginBottom: "18px" }}>
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
            Email or Registered Phone Number
          </label>
          <div style={{ position: "relative" }}>
            <FaEnvelope style={{ position: "absolute", left: "14px", top: "14px", color: "#9CA3AF" }} />
            <input
              type="text"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="e.g. rahul@payguard.com or 9876543210"
              required
              style={{
                width: "100%",
                padding: "12px 14px 12px 40px",
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
        <div style={{ marginBottom: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <label style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
              Password
            </label>
            <span style={{ fontSize: "12px", color: "#6B7280" }}>
              Demo: <code style={{ color: "#2563EB" }}>password123</code>
            </span>
          </div>
          <div style={{ position: "relative" }}>
            <FaLock style={{ position: "absolute", left: "14px", top: "14px", color: "#9CA3AF" }} />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              style={{
                width: "100%",
                padding: "12px 14px 12px 40px",
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
          disabled={loading}
          style={{
            width: "100%",
            background: "#2563EB",
            color: "#ffffff",
            border: "none",
            borderRadius: "12px",
            padding: "14px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 4px 12px rgba(37,99,235,0.25)",
          }}
        >
          {loading ? (
            <>
              <FaSyncAlt className="animate-spin" /> Authenticating...
            </>
          ) : (
            <>
              Sign In <FaArrowRight />
            </>
          )}
        </button>
      </form>

      {/* Demo Accounts Quick-Select for fast evaluator testing */}
      {demoUsers.length > 0 && (
        <div style={{ marginTop: "28px", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px", color: "#4B5563", fontSize: "13px", fontWeight: "600" }}>
            <FaUserCheck style={{ color: "#2563EB" }} /> 1-Click Demo Testing Personas:
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px" }}>
            {demoUsers.slice(0, 3).map((du) => (
              <button
                key={du.user_id}
                type="button"
                onClick={() => handleQuickFill(du)}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#93C5FD")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
              >
                <div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#1E293B" }}>
                    {du.full_name} ({du.account_id})
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>
                    {du.email} • Balance: ₹{du.current_balance.toLocaleString("en-IN")}
                  </div>
                </div>
                <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: "600", background: "#EFF6FF", padding: "4px 8px", borderRadius: "6px" }}>
                  Fill
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sign Up Link */}
      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "#6B7280" }}>
        Don't have an account?{" "}
        <Link to="/signup" style={{ color: "#2563EB", fontWeight: "600", textDecoration: "none" }}>
          Create an Account
        </Link>
      </div>
    </div>
  );
}
