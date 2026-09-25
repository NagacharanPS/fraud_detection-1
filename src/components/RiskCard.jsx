import React, { useState } from "react";
import { FaShieldAlt, FaChevronDown, FaChevronUp, FaInfoCircle, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";

function RiskCard({ risk }) {
  const [expandedRules, setExpandedRules] = useState({});

  if (!risk) return null;

  const toggleRuleExpand = (ruleCode) => {
    setExpandedRules((prev) => ({
      ...prev,
      [ruleCode]: !prev[ruleCode],
    }));
  };

  const triggeredStructuredReasons = (risk.structured_reasons || []).filter((r) => r.triggered === true);

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case "CRITICAL":
        return { bg: "#FEE2E2", text: "#991B1B", border: "#FCA5A5" };
      case "HIGH":
        return { bg: "#FFEDD5", text: "#C2410C", border: "#FDBA74" };
      case "MEDIUM":
        return { bg: "#FEF3C7", text: "#B45309", border: "#FCD34D" };
      case "LOW":
      default:
        return { bg: "#DCFCE7", text: "#15803D", border: "#86EFAC" };
    }
  };

  return (
    <div
      style={{
        marginTop: 25,
        padding: 25,
        background: "#fff",
        borderRadius: 15,
        border: "2px solid #2563EB",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, color: "#111827", fontSize: "20px" }}>AI Fraud Analysis</h2>
        <span
          style={{
            padding: "6px 14px",
            borderRadius: "20px",
            fontWeight: "700",
            fontSize: "13px",
            ...getSeverityStyle(risk.risk_level),
          }}
        >
          {risk.risk_level} RISK
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "16px" }}>
        <p style={{ margin: 0 }}>
          <strong>Receiver :</strong> {risk.receiver_name}
        </p>
        <p style={{ margin: 0 }}>
          <strong>Risk Score :</strong> {risk.risk_score}%
        </p>
        <p style={{ margin: 0 }}>
          <strong>Fraud Probability :</strong> {(risk.fraud_probability * 100).toFixed(2)}%
        </p>
        <p style={{ margin: 0 }}>
          <strong>Authentication :</strong> {risk.authentication}
        </p>
        <p style={{ margin: 0, gridColumn: "1 / -1" }}>
          <strong>Recommendation :</strong> {risk.recommendation}
        </p>
      </div>

      <h3
        style={{
          marginTop: "24px",
          marginBottom: "12px",
          color: "#111827",
          fontSize: "16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <FaShieldAlt color="#2563EB" /> Explainable Risk Grounding:
      </h3>

      {/* Structured Grounded Reasons */}
      {triggeredStructuredReasons.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {triggeredStructuredReasons.map((rule) => {
            const sevStyle = getSeverityStyle(rule.severity);
            const isExpanded = !!expandedRules[rule.rule_code];

            return (
              <div
                key={rule.rule_code}
                style={{
                  border: `1px solid ${sevStyle.border}`,
                  borderRadius: "10px",
                  background: "#FAFAFA",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "10px",
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                      <span
                        style={{
                          background: sevStyle.bg,
                          color: sevStyle.text,
                          padding: "2px 8px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "800",
                        }}
                      >
                        {rule.rule_code}
                      </span>
                      <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "600" }}>
                        {rule.rule_name}
                      </span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#1F2937", lineHeight: "1.4", fontWeight: "500" }}>
                      {rule.reason_text}
                    </div>
                  </div>

                  {rule.evidence && (
                    <button
                      onClick={() => toggleRuleExpand(rule.rule_code)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#2563EB",
                        fontSize: "12px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontWeight: "600",
                        padding: "4px",
                      }}
                    >
                      Evidence {isExpanded ? <FaChevronUp /> : <FaChevronDown />}
                    </button>
                  )}
                </div>

                {isExpanded && rule.evidence && (
                  <div
                    style={{
                      background: "#F1F5F9",
                      padding: "10px 14px",
                      borderTop: "1px solid #E2E8F0",
                      fontSize: "12px",
                      color: "#334155",
                    }}
                  >
                    <div style={{ fontWeight: "700", marginBottom: "6px", color: "#475569" }}>
                      🔍 Verifiable Audit Evidence:
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "6px" }}>
                      {Object.entries(rule.evidence).map(([k, v]) => (
                        <div key={k} style={{ background: "#fff", padding: "4px 8px", borderRadius: "4px", border: "1px solid #E2E8F0" }}>
                          <span style={{ color: "#64748B", textTransform: "capitalize" }}>{k.replace(/_/g, " ")}: </span>
                          <strong style={{ color: "#0F172A" }}>{Array.isArray(v) ? v.join(", ") : String(v)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <ul
          style={{
            marginTop: "10px",
            paddingLeft: "20px",
            color: "#374151",
          }}
        >
          {risk.reasons?.map((reason, index) => (
            <li
              key={index}
              style={{
                marginBottom: "10px",
              }}
            >
              {reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default RiskCard;
