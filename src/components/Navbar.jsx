import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaShieldAlt,
  FaUserCircle,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
  FaFingerprint,
  FaExchangeAlt,
  FaWallet,
  FaDownload,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import API from "../api";

function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout, switchAccount } = useAuth();
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [demoAccounts, setDemoAccounts] = useState([]);

  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await API.get("/api/auth/demo-users");
        if (res.data && Array.isArray(res.data)) {
          setDemoAccounts(res.data);
        }
      } catch (err) {
        console.error("Failed to load demo accounts:", err);
      }
    }
    loadAccounts();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleSwitchUser = (accountId) => {
    switchAccount(accountId);
    setShowSwitchModal(false);
    navigate("/");
  };

  const currentBalance = user?.account?.current_balance !== undefined
    ? user.account.current_balance
    : 50000;

  return (
    <>
      <nav
        style={{
          background: "#ffffff",
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          padding: "14px 28px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            textDecoration: "none",
          }}
        >
          <div
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
              color: "#fff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "20px",
              boxShadow: "0 4px 10px rgba(37,99,235,0.25)",
            }}
          >
            <FaShieldAlt />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color: "#111827",
                fontWeight: "700",
                fontSize: "18px",
              }}
            >
              UPI PayGuard AI
            </h2>

            <p
              style={{
                margin: "2px 0 0",
                color: "#6B7280",
                fontSize: "12px",
              }}
            >
              Biometric & OTP Fraud Defense
            </p>
          </div>
        </Link>

        {/* Right side controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {isAuthenticated && user ? (
            <>
              {/* Wallet Balance Badge */}
              <div
                style={{
                  background: "#F0FDF4",
                  border: "1px solid #BBF7D0",
                  color: "#15803D",
                  padding: "6px 14px",
                  borderRadius: "12px",
                  fontWeight: "600",
                  fontSize: "13px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaWallet style={{ color: "#16A34A" }} />
                <span>₹{currentBalance.toLocaleString("en-IN")}</span>
              </div>

              {/* User Profile Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  padding: "6px 12px",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    background: "#2563EB",
                    color: "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: "700",
                    fontSize: "13px",
                  }}
                >
                  {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                </div>

                <div style={{ textAlign: "left" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#1E293B", lineHeight: 1.2 }}>
                    {user.full_name || "Active User"}
                  </div>
                  <div style={{ fontSize: "11px", color: "#64748B" }}>
                    {user.account?.upi_id || `${user.phone_number}@upi`}
                  </div>
                </div>

                {user.has_face_enrolled && (
                  <span
                    title="Biometric Face Enrolled"
                    style={{
                      background: "#EFF6FF",
                      color: "#2563EB",
                      padding: "3px 6px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: "600",
                      display: "flex",
                      alignItems: "center",
                      gap: "3px",
                    }}
                  >
                    <FaFingerprint /> Face ID
                  </span>
                )}
              </div>

              {/* Switch Persona Button */}
              <button
                type="button"
                onClick={() => setShowSwitchModal(true)}
                style={{
                  background: "#F1F5F9",
                  color: "#334155",
                  border: "1px solid #CBD5E1",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title="Switch Account for Testing"
              >
                <FaExchangeAlt /> Switch
              </button>

              {/* Logout Button */}
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  background: "#FEE2E2",
                  color: "#991B1B",
                  border: "1px solid #FCA5A5",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
                title="Sign Out"
              >
                <FaSignOutAlt /> Logout
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                style={{
                  background: "#F1F5F9",
                  color: "#334155",
                  border: "1px solid #CBD5E1",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "13px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <FaSignInAlt /> Login
              </Link>

              <Link
                to="/signup"
                style={{
                  background: "#2563EB",
                  color: "#FFFFFF",
                  padding: "8px 16px",
                  borderRadius: "10px",
                  fontWeight: "600",
                  fontSize: "13px",
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 2px 6px rgba(37,99,235,0.25)",
                }}
              >
                <FaUserPlus /> Sign Up
              </Link>
            </>
          )}

          {/* Download Project ZIP */}
          <a
            href="/api/download-zip"
            download="upi_payguard_project.zip"
            style={{
              background: "linear-gradient(135deg, #059669, #10B981)",
              color: "#FFFFFF",
              padding: "8px 14px",
              borderRadius: "10px",
              fontWeight: "700",
              fontSize: "12px",
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
              transition: "transform 0.15s ease",
            }}
            title="Download Complete Project Archive (ZIP)"
          >
            <FaDownload style={{ fontSize: "11px" }} />
            <span>Download ZIP</span>
          </a>
        </div>
      </nav>

      {/* Switch Account Modal */}
      {showSwitchModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowSwitchModal(false)}
        >
          <div
            style={{
              background: "#ffffff",
              borderRadius: "18px",
              padding: "24px",
              width: "100%",
              maxWidth: "440px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#1E293B", fontWeight: "700" }}>
                Switch Testing Persona
              </h3>
              <button
                type="button"
                onClick={() => setShowSwitchModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  color: "#64748B",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {demoAccounts.map((acc) => (
                <div
                  key={acc.user_id}
                  onClick={() => handleSwitchUser(acc.account_id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    background: user?.account_id === acc.account_id ? "#EFF6FF" : "#F8FAFC",
                    border: user?.account_id === acc.account_id ? "2px solid #3B82F6" : "1px solid #E2E8F0",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: "700", fontSize: "14px", color: "#1E293B" }}>
                      {acc.full_name}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748B" }}>
                      {acc.upi_id} • Balance: ₹{acc.current_balance.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      background: user?.account_id === acc.account_id ? "#2563EB" : "#E2E8F0",
                      color: user?.account_id === acc.account_id ? "#ffffff" : "#475569",
                      padding: "4px 8px",
                      borderRadius: "6px",
                    }}
                  >
                    {user?.account_id === acc.account_id ? "Active" : "Switch"}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: "16px", textAlign: "center" }}>
              <Link
                to="/signup"
                onClick={() => setShowSwitchModal(false)}
                style={{
                  fontSize: "13px",
                  color: "#2563EB",
                  fontWeight: "600",
                  textDecoration: "none",
                }}
              >
                + Register New Persona with Your Face & Phone
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default Navbar;

