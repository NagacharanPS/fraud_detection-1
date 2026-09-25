import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  FaShieldAlt,
  FaSignOutAlt,
  FaSignInAlt,
  FaUserPlus,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
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
      {/* Brand Logo & Name */}
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
            width: "44px",
            height: "44px",
            borderRadius: "12px",
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
              fontWeight: "800",
              fontSize: "18px",
              letterSpacing: "-0.3px",
            }}
          >
            UPI PayGuard AI
          </h2>

          <p
            style={{
              margin: "2px 0 0",
              color: "#6B7280",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            Real-Time Fraud Prevention & Biometric Defense
          </p>
        </div>
      </Link>

      {/* Right-Side Authentication Controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {isAuthenticated && user ? (
          <>
            {/* User Profile Summary */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "#F8FAFC",
                border: "1px solid #E2E8F0",
                padding: "6px 14px",
                borderRadius: "12px",
              }}
            >
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #2563EB, #1E40AF)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: "800",
                  fontSize: "14px",
                  boxShadow: "0 2px 6px rgba(37,99,235,0.2)",
                }}
              >
                {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
              </div>

              <div style={{ textAlign: "left" }}>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#1E293B",
                    lineHeight: 1.2,
                  }}
                >
                  {user.full_name || "Active User"}
                </div>
                <div style={{ fontSize: "11px", color: "#64748B", marginTop: "1px" }}>
                  {user.account?.upi_id || user.email || `${user.phone_number}@upi`}
                </div>
              </div>
            </div>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "#FEE2E2",
                color: "#991B1B",
                border: "1px solid #FCA5A5",
                padding: "8px 14px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
              title="Sign Out"
            >
              <FaSignOutAlt /> Logout
            </button>
          </>
        ) : (
          <>
            {/* Unauthenticated State: Login & Sign Up */}
            <Link
              to="/login"
              style={{
                background: "#F1F5F9",
                color: "#334155",
                border: "1px solid #CBD5E1",
                padding: "9px 18px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "13px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                transition: "all 0.15s ease",
              }}
            >
              <FaSignInAlt /> Login
            </Link>

            <Link
              to="/signup"
              style={{
                background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                color: "#FFFFFF",
                padding: "9px 18px",
                borderRadius: "10px",
                fontWeight: "700",
                fontSize: "13px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 2px 8px rgba(37,99,235,0.3)",
                transition: "all 0.15s ease",
              }}
            >
              <FaUserPlus /> Sign Up
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
