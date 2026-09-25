import React, { useState } from "react";
import {
  FaCheckCircle,
  FaTable,
  FaHistory,
  FaChevronDown,
  FaChevronUp,
  FaClock,
  FaExclamationTriangle,
  FaShieldAlt,
  FaCalculator,
} from "react-icons/fa";

function GroundedEvidenceView({ rule }) {
  const [showProofTable, setShowProofTable] = useState(false);

  if (!rule || !rule.evidence) return null;

  const { evidence } = rule;
  const supportingRecords = evidence.supporting_records || [];
  const hourlyDist = evidence.hourly_distribution || [];
  const summaryStats = evidence.summary_stats;

  // Filter out internal non-scalar fields from the top metric tiles
  const scalarMetricKeys = Object.keys(evidence).filter(
    (k) =>
      ![
        "supporting_records",
        "hourly_distribution",
        "summary_stats",
        "proof_type",
      ].includes(k)
  );

  return (
    <div
      style={{
        background: "#F8FAFC",
        padding: "14px 16px",
        borderTop: "1px solid #E2E8F0",
        fontSize: "12px",
        color: "#334155",
        borderRadius: "0 0 10px 10px",
      }}
    >
      {/* 1. AGGREGATE METRIC TILES */}
      <div
        style={{
          fontWeight: "700",
          marginBottom: "8px",
          color: "#475569",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <FaCheckCircle color="#10B981" /> Grounded Context & Evidence Metrics:
        </span>
        <span style={{ fontSize: "11px", color: "#64748B", fontWeight: "600" }}>
          Deterministic Evaluation
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {scalarMetricKeys.map((k) => (
          <div
            key={k}
            style={{
              background: "#fff",
              padding: "6px 10px",
              borderRadius: "6px",
              border: "1px solid #E2E8F0",
              boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
            }}
          >
            <span
              style={{
                color: "#64748B",
                textTransform: "capitalize",
                fontSize: "11px",
                display: "block",
                marginBottom: "2px",
              }}
            >
              {k.replace(/_/g, " ")}:
            </span>
            <strong style={{ color: "#0F172A", fontSize: "13px" }}>
              {Array.isArray(evidence[k])
                ? evidence[k].join(", ")
                : typeof evidence[k] === "number" && k.includes("amount")
                ? `₹${evidence[k].toLocaleString("en-IN")}`
                : String(evidence[k])}
            </strong>
          </div>
        ))}
      </div>

      {/* 2. OPTIONAL HOURLY DISTRIBUTION VISUAL STRIP FOR TIME ANOMALIES */}
      {rule.rule_code === "UNUSUAL_TRANSACTION_TIME" && hourlyDist.length > 0 && (
        <div
          style={{
            background: "#EFF6FF",
            border: "1px solid #BFDBFE",
            borderRadius: "8px",
            padding: "10px 14px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: "700",
              color: "#1E40AF",
              marginBottom: "8px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaClock /> Sender Habitual 24-Hour Activity Window Profile:
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "6px",
            }}
          >
            {hourlyDist.map((w, idx) => (
              <div
                key={idx}
                style={{
                  background: w.is_current_window ? "#FEE2E2" : "#FFFFFF",
                  border: w.is_current_window ? "1.5px solid #EF4444" : "1px solid #DBEAFE",
                  borderRadius: "6px",
                  padding: "6px 8px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "10px", color: w.is_current_window ? "#991B1B" : "#475569", fontWeight: "600" }}>
                  {w.window}
                </div>
                <div style={{ fontSize: "14px", fontWeight: "800", color: w.is_current_window ? "#DC2626" : "#1E293B", marginTop: "2px" }}>
                  {w.count} txs ({w.percentage})
                </div>
                {w.is_current_window && (
                  <div style={{ fontSize: "10px", color: "#B91C1C", fontWeight: "700", marginTop: "2px" }}>
                    ⚠️ Current Txn Window
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. TOGGLE BUTTON FOR HISTORICAL LEDGER PROOF */}
      <button
        onClick={() => setShowProofTable(!showProofTable)}
        style={{
          width: "100%",
          padding: "8px 12px",
          background: showProofTable ? "#E2E8F0" : "#FFFFFF",
          border: "1px solid #CBD5E1",
          borderRadius: "8px",
          color: "#1E293B",
          fontSize: "12px",
          fontWeight: "700",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <FaTable color="#2563EB" />
          {rule.rule_code === "FIRST_TIME_RECEIVER" && supportingRecords.length === 0
            ? "📋 View Ledger Pair Verification Proof (0 records)"
            : `📋 View Supporting Historical Ledger Proof (${supportingRecords.length} records)`}
        </span>
        <span>{showProofTable ? <FaChevronUp /> : <FaChevronDown />}</span>
      </button>

      {/* 4. EXPANDABLE PROOF TABLE & CALCULATION BREAKDOWN */}
      {showProofTable && (
        <div
          style={{
            marginTop: "10px",
            background: "#FFFFFF",
            border: "1px solid #CBD5E1",
            borderRadius: "8px",
            overflow: "hidden",
            boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
          }}
        >
          {/* EMPTY STATE FOR FIRST TIME RECEIVER (0 records) */}
          {rule.rule_code === "FIRST_TIME_RECEIVER" && supportingRecords.length === 0 ? (
            <div
              style={{
                padding: "16px",
                background: "#FEFCE8",
                border: "1px dashed #FACC15",
                borderRadius: "6px",
                margin: "8px",
                textAlign: "center",
              }}
            >
              <FaCheckCircle color="#CA8A04" style={{ fontSize: "18px", marginBottom: "4px" }} />
              <div style={{ fontWeight: "700", color: "#854D0E", fontSize: "13px" }}>
                Grounded Ledger Audit: 0 Matching Records Found
              </div>
              <p style={{ margin: "4px 0 0", color: "#713F12", fontSize: "12px" }}>
                Audited complete historical transaction ledger across all database indexes. Confirmed zero prior settlements between sender and this recipient.
              </p>
            </div>
          ) : supportingRecords.length === 0 ? (
            <div style={{ padding: "14px", textAlign: "center", color: "#64748B" }}>
              No underlying transaction records found for this rule.
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "11px" }}>
                <thead>
                  <tr style={{ background: "#F1F5F9", borderBottom: "1px solid #CBD5E1" }}>
                    <th style={{ padding: "8px 10px", color: "#475569", fontWeight: "700" }}>Txn ID</th>
                    <th style={{ padding: "8px 10px", color: "#475569", fontWeight: "700" }}>Date / Time</th>
                    <th style={{ padding: "8px 10px", color: "#475569", fontWeight: "700" }}>Counterparty</th>
                    <th style={{ padding: "8px 10px", color: "#475569", fontWeight: "700" }}>Amount</th>
                    <th style={{ padding: "8px 10px", color: "#475569", fontWeight: "700" }}>Audit Status</th>
                  </tr>
                </thead>
                <tbody>
                  {supportingRecords.map((r, i) => (
                    <tr
                      key={r.txn_id || i}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        background: i % 2 === 0 ? "#FFFFFF" : "#F8FAFC",
                      }}
                    >
                      <td style={{ padding: "8px 10px", fontWeight: "700", color: "#2563EB" }}>
                        {r.txn_id || `TXN_REF_${i + 1}`}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#1E293B" }}>
                        {r.time ? (
                          <span style={{ fontWeight: "700", color: "#0F172A" }}>
                            {r.date} ({r.time})
                          </span>
                        ) : (
                          r.date_time || r.date || r.time_offset || "Past Record"
                        )}
                      </td>
                      <td style={{ padding: "8px 10px", color: "#475569" }}>
                        {r.receiver_name ? `${r.receiver_name} (${r.receiver_id || ""})` : r.receiver_id || r.category || "Recipient"}
                      </td>
                      <td style={{ padding: "8px 10px", fontWeight: "700", color: "#0F172A" }}>
                        {r.amount !== undefined ? `₹${Number(r.amount).toLocaleString("en-IN")}` : "-"}
                      </td>
                      <td style={{ padding: "8px 10px" }}>
                        <span
                          style={{
                            background: "#DCFCE7",
                            color: "#15803D",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            fontWeight: "700",
                            fontSize: "10px",
                          }}
                        >
                          {r.status || r.verdict || "VERIFIED"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. SUMMARY STATS FOOTER (For Amount Anomaly) */}
          {summaryStats && (
            <div
              style={{
                background: "#F8FAFC",
                borderTop: "1.5px solid #E2E8F0",
                padding: "10px 14px",
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: "11px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#1E40AF", fontWeight: "700" }}>
                <FaCalculator /> Derived Calculation Proof:
              </div>
              <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", color: "#334155" }}>
                <span>
                  Ledger Sum: <strong>₹{summaryStats.sum?.toLocaleString("en-IN")}</strong>
                </span>
                <span>
                  Sample Count: <strong>{summaryStats.count} transfers</strong>
                </span>
                <span>
                  Historical Mean: <strong>₹{summaryStats.derived_mean?.toLocaleString("en-IN")}</strong>
                </span>
                <span style={{ color: "#DC2626", fontWeight: "700" }}>
                  Current Txn: ₹{summaryStats.current_transaction?.toLocaleString("en-IN")} ({summaryStats.deviation_multiple} deviation)
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GroundedEvidenceView;
