import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaFilter,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHistory,
  FaUserCheck,
  FaUserClock,
  FaExchangeAlt,
  FaTimes,
  FaShieldAlt,
  FaLaptopCode,
  FaMobileAlt,
  FaArrowRight,
  FaSync,
} from "react-icons/fa";
import API from "../api";

function DatasetExplorer({ onSelectPairForSimulation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [receiverTypeFilter, setReceiverTypeFilter] = useState("ALL");
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    total_records: 0,
    discrepancies_count: 0,
    first_time_count: 0,
    existing_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [selectedAuditRecord, setSelectedAuditRecord] = useState(null);
  const [auditDetail, setAuditDetail] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, [searchQuery, receiverTypeFilter, discrepancyOnly]);

  async function fetchRecords() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (receiverTypeFilter !== "ALL") params.append("receiver_type", receiverTypeFilter);
      if (discrepancyOnly) params.append("discrepancy_only", "true");

      const res = await API.get(`/api/dataset-explorer?${params.toString()}`);
      if (res.data) {
        setRecords(res.data.records || []);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
      }
    } catch (err) {
      console.error("Failed to fetch dataset explorer records:", err);
    } finally {
      setLoading(false);
    }
  }

  async function openAuditModal(record) {
    setSelectedAuditRecord(record);
    try {
      setLoadingAudit(true);
      const res = await API.get(
        `/api/dataset-explorer/audit/${record.sender_account}/${record.receiver_account}`
      );
      setAuditDetail(res.data);
    } catch (err) {
      console.error("Failed to load audit detail:", err);
    } finally {
      setLoadingAudit(false);
    }
  }

  function closeAuditModal() {
    setSelectedAuditRecord(null);
    setAuditDetail(null);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* HEADER & SUMMARY CARDS */}
      <div
        style={{
          background: "linear-gradient(135deg, #1E293B, #0F172A)",
          color: "#fff",
          borderRadius: "16px",
          padding: "24px 28px",
          boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.3)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: "rgba(59, 130, 246, 0.2)",
                  color: "#60A5FA",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Verification & Audit Tool
              </span>
              <span style={{ fontSize: "12px", color: "#94A3B8" }}>
                Ground Truth vs Model Predictions
              </span>
            </div>
            <h2 style={{ margin: "10px 0 6px", fontSize: "24px", fontWeight: "800", color: "#F8FAFC" }}>
              Transaction Dataset Explorer & Ledger Audit
            </h2>
            <p style={{ margin: 0, color: "#94A3B8", fontSize: "14px", maxWidth: "700px" }}>
              Search across historical UPI ledger records, audit first-time vs existing receiver relationships, and inspect model prediction consistency with zero black-box ambiguity.
            </p>
          </div>

          <button
            onClick={fetchRecords}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              background: "rgba(255, 255, 255, 0.1)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#fff",
              padding: "10px 18px",
              borderRadius: "10px",
              cursor: "pointer",
              fontSize: "13px",
              fontWeight: "600",
              transition: "all 0.2s ease",
            }}
          >
            <FaSync style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh Dataset
          </button>
        </div>

        {/* METRICS ROW */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "16px",
            marginTop: "24px",
          }}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "16px 20px",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: "600" }}>Total Indexed Records</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#F8FAFC", marginTop: "4px" }}>
              {summary.total_records}
            </div>
            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>Full transaction ledger</div>
          </div>

          <div
            style={{
              background: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.25)",
              padding: "16px 20px",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#FBBF24", fontWeight: "600" }}>First-Time Receivers</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#FDE68A", marginTop: "4px" }}>
              {summary.first_time_count}
            </div>
            <div style={{ fontSize: "11px", color: "#F59E0B", marginTop: "4px" }}>0 prior historical transfers</div>
          </div>

          <div
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.25)",
              padding: "16px 20px",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#34D399", fontWeight: "600" }}>Existing Receivers</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#A7F3D0", marginTop: "4px" }}>
              {summary.existing_count}
            </div>
            <div style={{ fontSize: "11px", color: "#10B981", marginTop: "4px" }}>≥1 prior ledger transfers</div>
          </div>

          <div
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              padding: "16px 20px",
              borderRadius: "12px",
            }}
          >
            <div style={{ fontSize: "12px", color: "#F87171", fontWeight: "600" }}>Audited Discrepancies</div>
            <div style={{ fontSize: "24px", fontWeight: "800", color: "#FECACA", marginTop: "4px" }}>
              {summary.discrepancies_count}
            </div>
            <div style={{ fontSize: "11px", color: "#EF4444", marginTop: "4px" }}>Model vs Ledger mismatches</div>
          </div>
        </div>
      </div>

      {/* SEARCH AND CONTROLS BAR */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          padding: "18px 24px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          border: "1px solid #E2E8F0",
          display: "flex",
          flexWrap: "wrap",
          gap: "16px",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* Search Bar */}
        <div style={{ position: "relative", flex: "1 1 320px", minWidth: "260px" }}>
          <FaSearch
            style={{
              position: "absolute",
              left: "14px",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#94A3B8",
              fontSize: "14px",
            }}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by sender_id, receiver_id, name, or txn_id..."
            style={{
              width: "100%",
              padding: "12px 14px 12px 40px",
              border: "1.5px solid #CBD5E1",
              borderRadius: "10px",
              fontSize: "14px",
              outline: "none",
              background: "#F8FAFC",
              transition: "border-color 0.2s ease",
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          {/* Receiver Type Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "13px", fontWeight: "600", color: "#64748B" }}>Receiver:</span>
            <select
              value={receiverTypeFilter}
              onChange={(e) => setReceiverTypeFilter(e.target.value)}
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1.5px solid #CBD5E1",
                background: "#fff",
                fontSize: "13px",
                fontWeight: "600",
                color: "#1E293B",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Receiver Types</option>
              <option value="FIRST_TIME">First-Time Receivers</option>
              <option value="EXISTING">Existing Receivers</option>
            </select>
          </div>

          {/* Discrepancy Toggle Button */}
          <button
            onClick={() => setDiscrepancyOnly(!discrepancyOnly)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              border: discrepancyOnly ? "1.5px solid #DC2626" : "1.5px solid #CBD5E1",
              background: discrepancyOnly ? "#FEF2F2" : "#fff",
              color: discrepancyOnly ? "#DC2626" : "#475569",
              transition: "all 0.2s ease",
            }}
          >
            <FaExclamationTriangle color={discrepancyOnly ? "#DC2626" : "#94A3B8"} />
            {discrepancyOnly ? "Filtering: Discrepancies Only" : "Show Discrepancies Only"}
          </button>
        </div>
      </div>

      {/* DATASET TABLE */}
      <div
        style={{
          background: "#fff",
          borderRadius: "14px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
          border: "1px solid #E2E8F0",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#F8FAFC", borderBottom: "1.5px solid #E2E8F0" }}>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Txn ID & Time
                </th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Sender (From)
                </th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Receiver (To)
                </th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Amount
                </th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Actual Ledger History
                </th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Model Prediction
                </th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Audit Status
                </th>
                <th style={{ padding: "14px 18px", fontSize: "12px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                  Risk & Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                    Loading transactions from ledger...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", padding: "40px", color: "#64748B" }}>
                    No transaction records match the selected query and filters.
                  </td>
                </tr>
              ) : (
                records.map((r, index) => {
                  const isFirstTime = r.actual_receiver_type === "FIRST_TIME_RECEIVER";
                  const isDiscrepancy = r.is_discrepancy;

                  return (
                    <tr
                      key={r.transaction_id || index}
                      onClick={() => openAuditModal(r)}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        cursor: "pointer",
                        background: isDiscrepancy ? "#FFFBEB" : "transparent",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDiscrepancy ? "#FEF3C7" : "#F8FAFC";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isDiscrepancy ? "#FFFBEB" : "transparent";
                      }}
                    >
                      {/* Txn ID */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: "700", color: "#1E293B", fontSize: "13px" }}>
                          {r.transaction_id}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                          {new Date(r.timestamp).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </td>

                      {/* Sender */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: "700", color: "#2563EB", fontSize: "13px" }}>
                            {r.sender_account}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569" }}>{r.sender_name}</div>
                      </td>

                      {/* Receiver */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontWeight: "700", color: "#0D9488", fontSize: "13px" }}>
                            {r.receiver_account}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "#475569" }}>{r.receiver_name}</div>
                      </td>

                      {/* Amount */}
                      <td style={{ padding: "14px 18px" }}>
                        <div style={{ fontWeight: "700", color: "#0F172A", fontSize: "14px" }}>
                          ₹{r.amount?.toLocaleString("en-IN")}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B" }}>
                          {r.relationship_type || "Transfer"}
                        </div>
                      </td>

                      {/* Actual Ledger History */}
                      <td style={{ padding: "14px 18px" }}>
                        {isFirstTime ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "700",
                              background: "#FEF3C7",
                              color: "#B45309",
                              border: "1px solid #FDE68A",
                            }}
                          >
                            <FaUserClock fontSize="11px" /> 0 Prior Txs (First-Time)
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "20px",
                              fontSize: "12px",
                              fontWeight: "700",
                              background: "#DCFCE7",
                              color: "#15803D",
                              border: "1px solid #BBF7D0",
                            }}
                          >
                            <FaUserCheck fontSize="11px" /> {r.actual_prior_count} Prior Txs (Existing)
                          </span>
                        )}
                      </td>

                      {/* Model Prediction */}
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "600",
                            color: r.model_predicted_type === "FIRST_TIME_RECEIVER" ? "#D97706" : "#2563EB",
                          }}
                        >
                          {r.model_predicted_type === "FIRST_TIME_RECEIVER" ? "First-Time" : "Existing"}
                        </span>
                      </td>

                      {/* Audit Flag */}
                      <td style={{ padding: "14px 18px" }}>
                        {isDiscrepancy ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "800",
                              background: "#FEE2E2",
                              color: "#DC2626",
                              border: "1px solid #FECACA",
                            }}
                          >
                            <FaExclamationTriangle /> Discrepancy Flagged
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "5px",
                              padding: "4px 10px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "700",
                              background: "#F1F5F9",
                              color: "#475569",
                            }}
                          >
                            <FaCheckCircle color="#10B981" /> Grounded Match
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td style={{ padding: "14px 18px" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openAuditModal(r);
                          }}
                          style={{
                            padding: "6px 14px",
                            borderRadius: "8px",
                            border: "1px solid #CBD5E1",
                            background: "#fff",
                            color: "#1E293B",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <FaHistory fontSize="11px" color="#2563EB" /> Audit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROW-LEVEL LEDGER AUDIT MODAL */}
      {selectedAuditRecord && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            padding: "20px",
          }}
          onClick={closeAuditModal}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "18px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #E2E8F0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                padding: "20px 24px",
                borderBottom: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#F8FAFC",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: "800",
                    color: "#2563EB",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Ledger History & Ground Truth Audit
                </span>
                <h3 style={{ margin: "4px 0 0", fontSize: "18px", fontWeight: "800", color: "#0F172A" }}>
                  Transaction #{selectedAuditRecord.transaction_id}
                </h3>
              </div>
              <button
                onClick={closeAuditModal}
                style={{
                  background: "transparent",
                  border: "none",
                  fontSize: "18px",
                  color: "#64748B",
                  cursor: "pointer",
                  padding: "6px",
                  display: "flex",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Discrepancy Warning if present */}
              {selectedAuditRecord.is_discrepancy && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1.5px solid #F87171",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                  }}
                >
                  <FaExclamationTriangle color="#DC2626" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: "#991B1B", fontSize: "14px" }}>
                      Ledger Discrepancy Detected
                    </strong>
                    <p style={{ margin: "4px 0 0", color: "#7F1D1D", fontSize: "13px", lineHeight: "1.4" }}>
                      {selectedAuditRecord.discrepancy_details ||
                        `Model flagged as ${selectedAuditRecord.model_predicted_type} but ground ledger confirms ${selectedAuditRecord.actual_prior_count} prior transfers.`}
                    </p>
                  </div>
                </div>
              )}

              {/* SENDER TO RECEIVER PIPELINE CARD */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "14px",
                  padding: "18px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                    Sender Account
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#1E293B", marginTop: "2px" }}>
                    {selectedAuditRecord.sender_account}
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    {selectedAuditRecord.sender_name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#2563EB", fontWeight: "600", marginTop: "2px" }}>
                    Trust Score: {selectedAuditRecord.sender_trust_score}/100
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A", marginBottom: "4px" }}>
                    ₹{selectedAuditRecord.amount?.toLocaleString("en-IN")}
                  </span>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "50%",
                      background: "#EEF2FF",
                      color: "#4F46E5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                    }}
                  >
                    <FaArrowRight />
                  </div>
                  <span style={{ fontSize: "11px", color: "#64748B", marginTop: "4px" }}>
                    {selectedAuditRecord.relationship_type || "Transfer"}
                  </span>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                    Receiver Account
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#1E293B", marginTop: "2px" }}>
                    {selectedAuditRecord.receiver_account}
                  </div>
                  <div style={{ fontSize: "12px", color: "#475569" }}>
                    {selectedAuditRecord.receiver_name}
                  </div>
                  <div style={{ fontSize: "11px", color: "#0D9488", fontWeight: "600", marginTop: "2px" }}>
                    Trust Score: {selectedAuditRecord.receiver_trust_score}/100
                  </div>
                </div>
              </div>

              {/* AUDIT BREAKDOWN METRICS */}
              <div>
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "800", color: "#1E293B" }}>
                  🔍 Grounded Historical Ledger Analysis
                </h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#64748B" }}>Prior Transfers Count</div>
                    <div style={{ fontSize: "18px", fontWeight: "800", color: "#0F172A", marginTop: "4px" }}>
                      {auditDetail?.ledger_audit?.actual_prior_transactions_count ?? selectedAuditRecord.actual_prior_count}{" "}
                      <span style={{ fontSize: "12px", fontWeight: "600", color: "#64748B" }}>transfers</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#10B981", marginTop: "2px" }}>
                      Formula: count({selectedAuditRecord.sender_account} ➔ {selectedAuditRecord.receiver_account})
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#64748B" }}>Receiver Verification Verdict</div>
                    <div
                      style={{
                        fontSize: "14px",
                        fontWeight: "800",
                        marginTop: "6px",
                        color:
                          selectedAuditRecord.actual_receiver_type === "FIRST_TIME_RECEIVER"
                            ? "#D97706"
                            : "#16A34A",
                      }}
                    >
                      {selectedAuditRecord.actual_receiver_type === "FIRST_TIME_RECEIVER"
                        ? "⚠️ First-Time Receiver (0 Prior Txs)"
                        : "✅ Verified Existing Counterparty"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#64748B" }}>Last Known Transfer Time</div>
                    <div style={{ fontSize: "13px", fontWeight: "700", color: "#0F172A", marginTop: "4px" }}>
                      {selectedAuditRecord.last_transfer_timestamp
                        ? new Date(selectedAuditRecord.last_transfer_timestamp).toLocaleString("en-IN")
                        : "No previous transaction found in ledger"}
                    </div>
                  </div>

                  <div
                    style={{
                      background: "#FFFFFF",
                      border: "1px solid #E2E8F0",
                      borderRadius: "10px",
                      padding: "12px 16px",
                    }}
                  >
                    <div style={{ fontSize: "12px", color: "#64748B" }}>Last Known Amount / Avg</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A", marginTop: "4px" }}>
                      {selectedAuditRecord.last_transfer_amount
                        ? `₹${selectedAuditRecord.last_transfer_amount.toLocaleString("en-IN")}`
                        : "N/A (First Transfer)"}
                    </div>
                  </div>
                </div>
              </div>

              {/* SENDER REGISTERED DEVICES EVIDENCE */}
              {auditDetail?.sender?.registered_devices && (
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: "10px",
                    padding: "12px 16px",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "6px" }}>
                    📱 Sender Registered Devices Registry:
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {auditDetail.sender.registered_devices.map((d, i) => (
                      <span
                        key={i}
                        style={{
                          background: "#EEF2FF",
                          color: "#3730A3",
                          padding: "4px 10px",
                          borderRadius: "6px",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ACTION FOOTER */}
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                  marginTop: "8px",
                  borderTop: "1px solid #E2E8F0",
                  paddingTop: "16px",
                }}
              >
                <button
                  onClick={closeAuditModal}
                  style={{
                    padding: "10px 18px",
                    background: "#F1F5F9",
                    border: "1px solid #CBD5E1",
                    borderRadius: "8px",
                    color: "#475569",
                    fontWeight: "600",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>

                {onSelectPairForSimulation && (
                  <button
                    onClick={() => {
                      onSelectPairForSimulation(
                        selectedAuditRecord.sender_account,
                        selectedAuditRecord.receiver_account,
                        selectedAuditRecord.amount
                      );
                      closeAuditModal();
                    }}
                    style={{
                      padding: "10px 20px",
                      background: "linear-gradient(135deg, #2563EB, #1D4ED8)",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontWeight: "700",
                      fontSize: "13px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    <FaExchangeAlt /> Load in Payment Simulator
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DatasetExplorer;
