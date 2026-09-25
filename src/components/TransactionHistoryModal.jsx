import React, { useState } from "react";

export default function TransactionHistoryModal({ visible, onClose, evidenceData, loading, accounts = [] }) {
  const [activeTab, setActiveTab] = useState("pair");

  if (!visible) return null;

  const sender = evidenceData?.sender_profile || {};
  const receiver = evidenceData?.receiver_profile || {};
  const pair = evidenceData?.pair_summary || {};
  const proofPoints = evidenceData?.proof_points || [];
  const pairTxns = evidenceData?.pair_transactions || [];
  const senderTxns = evidenceData?.sender_recent_transactions || [];
  const receiverTxns = evidenceData?.receiver_recent_transactions || [];

  const formatAccountLabel = (accId, nameFromBackend) => {
    if (nameFromBackend && nameFromBackend.trim()) {
      return `${accId} (${nameFromBackend})`;
    }
    const found = accounts.find((a) => a.account_id === accId);
    if (found?.account_name) {
      return `${accId} (${found.account_name})`;
    }
    return accId || "N/A";
  };

  const tableHeaderStyle = {
    textAlign: "left",
    padding: "10px 12px",
    background: "#F3F4F6",
    fontSize: "12px",
    fontWeight: "700",
    color: "#374151",
    borderBottom: "1px solid #E5E7EB",
  };

  const tableCellStyle = {
    padding: "10px 12px",
    borderBottom: "1px solid #F3F4F6",
    fontSize: "13px",
    color: "#1F2937",
  };

  const tabButtonStyle = (isActive) => ({
    padding: "8px 16px",
    borderRadius: "8px",
    border: "none",
    background: isActive ? "#2563EB" : "#F3F4F6",
    color: isActive ? "#FFFFFF" : "#4B5563",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.2s ease",
  });

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "24px 28px",
          maxWidth: "880px",
          width: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
          position: "relative",
          color: "#111827",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: "16px",
            right: "18px",
            background: "#F3F4F6",
            border: "none",
            borderRadius: "50%",
            width: "32px",
            height: "32px",
            fontSize: "20px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4B5563",
          }}
        >
          &times;
        </button>

        {/* Modal Header */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>🛡️</span>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#111827" }}>
              Risk Evidence & Transaction Proof
            </h2>
          </div>
          <p style={{ margin: "4px 0 0 0", fontSize: "13px", color: "#6B7280" }}>
            Real-time forensic verification between <strong>{sender.account_id || "Sender"} ({sender.account_name})</strong> and <strong>{receiver.account_id || "Receiver"} ({receiver.account_name})</strong>.
          </p>
        </div>

        {loading ? (
          <div style={{ padding: "40px", textAlign: "center", color: "#6B7280" }}>
            <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
            Loading forensic transaction analysis...
          </div>
        ) : (
          <>
            {/* Top Comparative Summary Cards */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {/* Pair Interaction Status */}
              <div
                style={{
                  background: pair.is_first_time_pair ? "#FEF2F2" : "#ECFDF5",
                  border: `1px solid ${pair.is_first_time_pair ? "#FCA5A5" : "#A7F3D0"}`,
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: pair.is_first_time_pair ? "#991B1B" : "#065F46", textTransform: "uppercase" }}>
                  Relationship History
                </div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: pair.is_first_time_pair ? "#DC2626" : "#059669", marginTop: "4px" }}>
                  {pair.prior_transactions_count === 0 ? "0 Prior Transfers" : `${pair.prior_transactions_count} Prior Transfers`}
                </div>
                <div style={{ fontSize: "12px", color: "#4B5563", marginTop: "2px" }}>
                  {pair.is_first_time_pair ? "⚠️ First-Time Counterparty Anomaly" : `Total ₹${Number(pair.prior_total_volume || 0).toLocaleString()} transferred`}
                </div>
              </div>

              {/* Amount vs Historical Average */}
              <div
                style={{
                  background: pair.amount_vs_average_ratio > 2.5 ? "#FFFBEB" : "#F9FAFB",
                  border: `1px solid ${pair.amount_vs_average_ratio > 2.5 ? "#FDE68A" : "#E5E7EB"}`,
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: pair.amount_vs_average_ratio > 2.5 ? "#92400E" : "#374151", textTransform: "uppercase" }}>
                  Amount Anomaly Spike
                </div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#111827", marginTop: "4px" }}>
                  {pair.amount_vs_average_ratio}x Deviation
                </div>
                <div style={{ fontSize: "12px", color: "#4B5563", marginTop: "2px" }}>
                  Txn: ₹{Number(pair.current_amount || 0).toLocaleString()} (Sender Avg: ₹{Number(sender.average_amount || 0).toLocaleString()})
                </div>
              </div>

              {/* Entity Compatibility */}
              <div
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "12px",
                  padding: "14px",
                }}
              >
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#475569", textTransform: "uppercase" }}>
                  Entity Type Flow
                </div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: "#1E293B", marginTop: "4px" }}>
                  {sender.account_type || "SENDER"} ➔ {receiver.account_type || "RECEIVER"}
                </div>
                <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>
                  Sender Trust: {sender.trust_score}% | Rec Trust: {receiver.trust_score}%
                </div>
              </div>
            </div>

            {/* AI Forensic Proof Points */}
            {proofPoints.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", fontWeight: "700", color: "#1F2937" }}>
                  🔍 Forensic Proof Points (Why AI flagged this transaction):
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {proofPoints.map((point, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "8px",
                        background: point.severity === "CRITICAL" || point.severity === "HIGH" ? "#FEF2F2" : "#F0FDF4",
                        borderLeft: `4px solid ${point.severity === "CRITICAL" || point.severity === "HIGH" ? "#EF4444" : "#10B981"}`,
                        fontSize: "13px",
                      }}
                    >
                      <strong style={{ color: point.severity === "CRITICAL" || point.severity === "HIGH" ? "#991B1B" : "#065F46" }}>
                        {point.title}
                      </strong>
                      <div style={{ color: "#374151", marginTop: "2px", lineHeight: "1.4" }}>
                        {point.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tab Navigation */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "14px", borderBottom: "1px solid #E5E7EB", paddingBottom: "10px" }}>
              <button
                style={tabButtonStyle(activeTab === "pair")}
                onClick={() => setActiveTab("pair")}
              >
                🤝 Direct Pair History ({pairTxns.length})
              </button>
              <button
                style={tabButtonStyle(activeTab === "sender")}
                onClick={() => setActiveTab("sender")}
              >
                📤 Sender Activity ({senderTxns.length})
              </button>
              <button
                style={tabButtonStyle(activeTab === "receiver")}
                onClick={() => setActiveTab("receiver")}
              >
                📥 Receiver Activity ({receiverTxns.length})
              </button>
            </div>

            {/* Tab 1: Direct Pair Transactions */}
            {activeTab === "pair" && (
              <div>
                {pairTxns.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>Txn ID</th>
                          <th style={tableHeaderStyle}>Amount</th>
                          <th style={tableHeaderStyle}>Timestamp</th>
                          <th style={tableHeaderStyle}>Status</th>
                          <th style={tableHeaderStyle}>Risk</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pairTxns.map((tx) => (
                          <tr key={tx.transaction_id}>
                            <td style={tableCellStyle}>{tx.transaction_id}</td>
                            <td style={tableCellStyle}>₹{Number(tx.amount || 0).toLocaleString()}</td>
                            <td style={tableCellStyle}>{tx.transaction_time ? new Date(tx.transaction_time).toLocaleString() : "N/A"}</td>
                            <td style={tableCellStyle}>
                              <span
                                style={{
                                  padding: "2px 8px",
                                  borderRadius: "9999px",
                                  fontSize: "11px",
                                  fontWeight: "600",
                                  backgroundColor: tx.transaction_status === "SUCCESS" ? "#DEF7EC" : "#FDE8E8",
                                  color: tx.transaction_status === "SUCCESS" ? "#03543F" : "#9B1C1C",
                                }}
                              >
                                {tx.transaction_status}
                              </span>
                            </td>
                            <td style={tableCellStyle}>{tx.risk_level}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "24px",
                      background: "#F9FAFB",
                      borderRadius: "10px",
                      textAlign: "center",
                      border: "1px dashed #D1D5DB",
                    }}
                  >
                    <div style={{ fontSize: "24px", marginBottom: "6px" }}>⚠️</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#1F2937" }}>
                      Zero Prior Transactions Between These Two Accounts
                    </div>
                    <div style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>
                      Sender <strong>{sender.account_id}</strong> has never previously transferred money to Receiver <strong>{receiver.account_id}</strong>.
                      This confirms the AI signal that this is an unprecedented, unverified transaction relationship.
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Sender Activity */}
            {activeTab === "sender" && (
              <div>
                <div style={{ marginBottom: "10px", fontSize: "13px", color: "#4B5563" }}>
                  Typical recent outbound transactions of <strong>{sender.account_name}</strong> ({sender.account_type}) showing average transfer size of ₹{Number(sender.average_amount || 0).toLocaleString()}:
                </div>
                {senderTxns.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>Txn ID</th>
                          <th style={tableHeaderStyle}>Beneficiary</th>
                          <th style={tableHeaderStyle}>Amount</th>
                          <th style={tableHeaderStyle}>Timestamp</th>
                          <th style={tableHeaderStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {senderTxns.map((tx) => (
                          <tr key={tx.transaction_id}>
                            <td style={tableCellStyle}>{tx.transaction_id}</td>
                            <td style={tableCellStyle}>{formatAccountLabel(tx.receiver_account, tx.receiver_name)}</td>
                            <td style={tableCellStyle}>₹{Number(tx.amount || 0).toLocaleString()}</td>
                            <td style={tableCellStyle}>{tx.transaction_time ? new Date(tx.transaction_time).toLocaleString() : "N/A"}</td>
                            <td style={tableCellStyle}>{tx.transaction_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "#6B7280" }}>No recent records for sender.</p>
                )}
              </div>
            )}

            {/* Tab 3: Receiver Activity */}
            {activeTab === "receiver" && (
              <div>
                <div style={{ marginBottom: "10px", fontSize: "13px", color: "#4B5563" }}>
                  Recent transaction activity for Receiver <strong>{receiver.account_name}</strong> ({receiver.account_type}):
                </div>
                {receiverTxns.length > 0 ? (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          <th style={tableHeaderStyle}>Txn ID</th>
                          <th style={tableHeaderStyle}>Sender</th>
                          <th style={tableHeaderStyle}>Amount</th>
                          <th style={tableHeaderStyle}>Timestamp</th>
                          <th style={tableHeaderStyle}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receiverTxns.map((tx) => (
                          <tr key={tx.transaction_id}>
                            <td style={tableCellStyle}>{tx.transaction_id}</td>
                            <td style={tableCellStyle}>{formatAccountLabel(tx.sender_account, tx.sender_name)}</td>
                            <td style={tableCellStyle}>₹{Number(tx.amount || 0).toLocaleString()}</td>
                            <td style={tableCellStyle}>{tx.transaction_time ? new Date(tx.transaction_time).toLocaleString() : "N/A"}</td>
                            <td style={tableCellStyle}>{tx.transaction_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ color: "#6B7280" }}>No recent records for receiver.</p>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={onClose}
                style={{
                  padding: "10px 20px",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "600",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                Close Evidence Report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
