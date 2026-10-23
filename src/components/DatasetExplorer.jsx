import React, { useState, useEffect } from "react";
import {
  FaSearch,
  FaFileAlt,
  FaUserPlus,
  FaUsers,
  FaExclamationTriangle,
  FaCheck,
  FaSync,
  FaTimes,
  FaArrowRight,
  FaExchangeAlt,
  FaChevronDown,
  FaChevronLeft,
  FaChevronRight,
  FaAngleDoubleLeft,
  FaAngleDoubleRight,
  FaShieldAlt,
} from "react-icons/fa";
import API from "../api";

function formatTableDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const month = months[d.getMonth()];
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, "0");
  return `${day} ${month}, ${hoursStr}:${minutes} ${ampm}`;
}

const AVATAR_COLORS = [
  "#2563EB", // Blue
  "#059669", // Emerald
  "#E11D48", // Rose
  "#8B5CF6", // Purple
  "#D97706", // Amber
  "#0891B2", // Cyan
  "#BE185D", // Ruby / Pink
  "#7C3AED", // Violet
];

function getAvatarColor(str) {
  if (!str) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function getInitials(name, fallbackId) {
  if (!name) return (fallbackId || "AC").slice(0, 2).toUpperCase();
  const clean = name.replace(/\([^)]*\)/g, "").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || (fallbackId || "AC").slice(0, 2).toUpperCase();
}

function DatasetExplorer({ onSelectPairForSimulation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [receiverTypeFilter, setReceiverTypeFilter] = useState("ALL"); // "ALL" | "FIRST_TIME" | "EXISTING"
  const [statusFilter, setStatusFilter] = useState("ALL"); // "ALL" | "FRAUD" | "FLAGGED" | "SAFE"
  const [discrepancyOnly, setDiscrepancyOnly] = useState(false);
  const [sortBy, setSortBy] = useState("newest"); // "newest" | "oldest" | "amount_high" | "amount_low"
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMatching, setTotalMatching] = useState(0);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState({
    total_records: 0,
    discrepancies_count: 0,
    first_time_count: 0,
    existing_count: 0,
    fraud_count: 0,
    flagged_count: 0,
    safe_count: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshFeedback, setRefreshFeedback] = useState(null);
  const [selectedAuditRecord, setSelectedAuditRecord] = useState(null);
  const [auditDetail, setAuditDetail] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Reset to page 1 whenever search, filters or sort changes
  useEffect(() => {
    setPage(1);
  }, [searchQuery, receiverTypeFilter, statusFilter, discrepancyOnly, sortBy]);

  // Fetch records whenever page, limit, search, filter, or sort changes
  useEffect(() => {
    fetchRecords();
  }, [searchQuery, receiverTypeFilter, statusFilter, discrepancyOnly, sortBy, page, limit]);

  async function fetchRecords() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (receiverTypeFilter !== "ALL") params.append("receiver_type", receiverTypeFilter);
      if (statusFilter !== "ALL") params.append("status_filter", statusFilter);
      if (discrepancyOnly) params.append("discrepancy_only", "true");
      params.append("sort_by", sortBy);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await API.get(`/api/dataset-explorer?${params.toString()}`);
      if (res.data) {
        setRecords(res.data.records || []);
        setTotalPages(res.data.total_pages || 1);
        setTotalMatching(res.data.total || 0);
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

  async function handleRefresh() {
    if (isRefreshing || loading) return;
    try {
      setIsRefreshing(true);
      setRefreshFeedback(null);
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.append("q", searchQuery.trim());
      if (receiverTypeFilter !== "ALL") params.append("receiver_type", receiverTypeFilter);
      if (statusFilter !== "ALL") params.append("status_filter", statusFilter);
      if (discrepancyOnly) params.append("discrepancy_only", "true");
      params.append("sort_by", sortBy);
      params.append("page", String(page));
      params.append("limit", String(limit));

      const res = await API.get(`/api/dataset-explorer?${params.toString()}`);
      if (res.data) {
        const fetchedRecords = res.data.records || [];
        setRecords(fetchedRecords);
        setTotalPages(res.data.total_pages || 1);
        setTotalMatching(res.data.total || 0);
        if (res.data.summary) {
          setSummary(res.data.summary);
        }
        setRefreshFeedback({
          type: "success",
          message: `Refreshed ${res.data.total?.toLocaleString() || fetchedRecords.length} transactions.`,
        });
        setTimeout(() => setRefreshFeedback(null), 3000);
      }
    } catch (err) {
      console.error("Failed to refresh dataset:", err);
      setRefreshFeedback({
        type: "error",
        message: "Failed to refresh dataset. Please try again.",
      });
      setTimeout(() => setRefreshFeedback(null), 3000);
    } finally {
      setIsRefreshing(false);
    }
  }

  const sortedRecords = records;

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        fontFamily: "'Inter', sans-serif",
        width: "100%",
      }}
    >
      {/* =========================================================================
          1. HEADER BANNER: TRANSACTION EXPLORER & METRIC CARDS
          ========================================================================= */}
      <div
        style={{
          background: "linear-gradient(135deg, #1D3A8A 0%, #2563EB 50%, #6366F1 100%)",
          borderRadius: "24px",
          padding: "26px 30px",
          color: "#FFFFFF",
          boxShadow: "0 10px 30px -5px rgba(37, 99, 235, 0.25)",
        }}
      >
        {/* TOP ROW: TITLE, SUBTITLE & REFRESH BUTTON */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: "22px",
                fontWeight: "700",
                letterSpacing: "-0.01em",
                color: "#FFFFFF",
              }}
            >
              Transaction Explorer
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: "rgba(255, 255, 255, 0.85)",
                lineHeight: "18px",
              }}
            >
              See past transactions and check if the AI's guess matches the real records.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            style={{
              background: "rgba(255, 255, 255, 0.18)",
              border: "1px solid rgba(255, 255, 255, 0.28)",
              color: "#FFFFFF",
              padding: "7px 16px",
              borderRadius: "10px",
              cursor: isRefreshing || loading ? "not-allowed" : "pointer",
              fontSize: "12.5px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "all 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (!isRefreshing && !loading) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.28)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isRefreshing && !loading) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.18)";
              }
            }}
          >
            <FaSync
              size={11}
              style={{
                animation: isRefreshing || loading ? "spin 1s linear infinite" : "none",
              }}
            />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {refreshFeedback && (
          <div
            style={{
              marginTop: "12px",
              padding: "6px 14px",
              borderRadius: "8px",
              background: "rgba(255, 255, 255, 0.2)",
              fontSize: "12px",
              fontWeight: "600",
              display: "inline-block",
            }}
          >
            {refreshFeedback.message}
          </div>
        )}

        {/* 5 STATS CARDS GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "14px",
            marginTop: "22px",
          }}
        >
          {/* CARD 1: TOTAL TRANSACTIONS */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "16px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <FaFileAlt size={16} color="#2563EB" />
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#FFFFFF", lineHeight: 1 }}>
                {summary.total_records?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#FFFFFF", marginTop: "4px" }}>
                Total transactions
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)", marginTop: "1px" }}>
                All records
              </div>
            </div>
          </div>

          {/* CARD 2: NEW RECEIVERS */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "16px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <FaUserPlus size={16} color="#D97706" />
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#FFFFFF", lineHeight: 1 }}>
                {summary.first_time_count?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#FFFFFF", marginTop: "4px" }}>
                New receivers
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)", marginTop: "1px" }}>
                Never paid before
              </div>
            </div>
          </div>

          {/* CARD 3: KNOWN RECEIVERS */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "16px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <FaUsers size={17} color="#16A34A" />
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#FFFFFF", lineHeight: 1 }}>
                {summary.existing_count?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#FFFFFF", marginTop: "4px" }}>
                Known receivers
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)", marginTop: "1px" }}>
                Paid before
              </div>
            </div>
          </div>

          {/* CARD 4: MISMATCHES */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "16px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <FaExclamationTriangle size={16} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#FFFFFF", lineHeight: 1 }}>
                {summary.discrepancies_count?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#FFFFFF", marginTop: "4px" }}>
                Mismatches
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)", marginTop: "1px" }}>
                AI guess differs from records
              </div>
            </div>
          </div>

          {/* CARD 5: CONFIRMED FRAUD */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.14)",
              backdropFilter: "blur(6px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "16px",
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
              }}
            >
              <FaShieldAlt size={17} color="#DC2626" />
            </div>
            <div>
              <div style={{ fontSize: "22px", fontWeight: "800", color: "#FFFFFF", lineHeight: 1 }}>
                {summary.fraud_count?.toLocaleString() || 0}
              </div>
              <div style={{ fontSize: "12.5px", fontWeight: "700", color: "#FFFFFF", marginTop: "4px" }}>
                Confirmed fraud
              </div>
              <div style={{ fontSize: "11px", color: "rgba(255, 255, 255, 0.75)", marginTop: "1px" }}>
                Blocked by the system
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. SEARCH & FILTER CONTROLS BAR
          ========================================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "18px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 14px rgba(15, 23, 42, 0.03)",
          padding: "10px 18px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
        }}
      >
        {/* SEARCH INPUT */}
        <div
          style={{
            flex: "1 1 280px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          <FaSearch color="#94A3B8" size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, account ID or transaction ID"
            style={{
              border: "none",
              outline: "none",
              width: "100%",
              fontSize: "13.5px",
              color: "#0F172A",
              background: "transparent",
            }}
          />
        </div>

        {/* RIGHT CONTROLS: SEGMENTED FILTERS, MISMATCH TOGGLE & SORT */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          {/* SEGMENTED RECEIVER FILTER (All / New / Known) */}
          <div
            style={{
              background: "#F1F5F9",
              borderRadius: "10px",
              padding: "3px",
              display: "inline-flex",
              gap: "2px",
            }}
          >
            <button
              type="button"
              onClick={() => setReceiverTypeFilter("ALL")}
              style={{
                border: "none",
                background: receiverTypeFilter === "ALL" ? "#FFFFFF" : "transparent",
                color: receiverTypeFilter === "ALL" ? "#2563EB" : "#64748B",
                fontWeight: receiverTypeFilter === "ALL" ? "700" : "600",
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow:
                  receiverTypeFilter === "ALL"
                    ? "0 2px 6px rgba(0, 0, 0, 0.06)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setReceiverTypeFilter("FIRST_TIME")}
              style={{
                border: "none",
                background: receiverTypeFilter === "FIRST_TIME" ? "#FFFFFF" : "transparent",
                color: receiverTypeFilter === "FIRST_TIME" ? "#2563EB" : "#64748B",
                fontWeight: receiverTypeFilter === "FIRST_TIME" ? "700" : "600",
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow:
                  receiverTypeFilter === "FIRST_TIME"
                    ? "0 2px 6px rgba(0, 0, 0, 0.06)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              New
            </button>
            <button
              type="button"
              onClick={() => setReceiverTypeFilter("EXISTING")}
              style={{
                border: "none",
                background: receiverTypeFilter === "EXISTING" ? "#FFFFFF" : "transparent",
                color: receiverTypeFilter === "EXISTING" ? "#2563EB" : "#64748B",
                fontWeight: receiverTypeFilter === "EXISTING" ? "700" : "600",
                fontSize: "12px",
                padding: "6px 14px",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow:
                  receiverTypeFilter === "EXISTING"
                    ? "0 2px 6px rgba(0, 0, 0, 0.06)"
                    : "none",
                transition: "all 0.15s ease",
              }}
            >
              Known
            </button>
          </div>

          {/* SEGMENTED STATUS FILTER (All status / Fraud / Suspicious / Safe) */}
          <div
            style={{
              background: "#F1F5F9",
              borderRadius: "10px",
              padding: "3px",
              display: "inline-flex",
              gap: "2px",
            }}
          >
            {[
              { key: "ALL", label: "All status" },
              { key: "FRAUD", label: "Fraud", color: "#DC2626" },
              { key: "FLAGGED", label: "Suspicious", color: "#D97706" },
              { key: "SAFE", label: "Safe", color: "#16A34A" },
            ].map((btn) => {
              const isActive = statusFilter === btn.key;
              return (
                <button
                  key={btn.key}
                  type="button"
                  onClick={() => setStatusFilter(btn.key)}
                  style={{
                    border: "none",
                    background: isActive ? "#FFFFFF" : "transparent",
                    color: isActive ? (btn.color || "#2563EB") : "#64748B",
                    fontWeight: isActive ? "700" : "600",
                    fontSize: "12px",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    boxShadow: isActive ? "0 2px 6px rgba(0, 0, 0, 0.06)" : "none",
                    transition: "all 0.15s ease",
                  }}
                >
                  {btn.label}
                </button>
              );
            })}
          </div>

          {/* MISMATCHES ONLY TOGGLE */}
          <button
            type="button"
            onClick={() => setDiscrepancyOnly(!discrepancyOnly)}
            style={{
              background: discrepancyOnly ? "#FEE2E2" : "#FEF2F2",
              border: discrepancyOnly ? "1.5px solid #DC2626" : "1px solid #FECACA",
              color: "#B91C1C",
              fontSize: "12px",
              fontWeight: "700",
              padding: "6px 14px",
              borderRadius: "10px",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            Mismatches only
          </button>

          {/* SORT DROPDOWN */}
          <div style={{ position: "relative" }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: "10px",
                padding: "6px 28px 6px 12px",
                fontSize: "12px",
                fontWeight: "700",
                color: "#334155",
                cursor: "pointer",
                outline: "none",
                appearance: "none",
              }}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount_high">Amount: High to Low</option>
              <option value="amount_low">Amount: Low to High</option>
            </select>
            <FaChevronDown
              size={9}
              color="#64748B"
              style={{
                position: "absolute",
                right: "10px",
                top: "50%",
                transform: "translateY(-50%)",
                pointerEvents: "none",
              }}
            />
          </div>
        </div>
      </div>

      {/* SUBTITLE: RECORD COUNTER */}
      <div style={{ padding: "0 6px", fontSize: "13px", color: "#64748B" }}>
        Showing <strong style={{ color: "#2563EB" }}>{sortedRecords.length}</strong> of{" "}
        <strong style={{ color: "#0F172A" }}>{totalMatching.toLocaleString()}</strong> transactions
      </div>

      {/* =========================================================================
          3. TRANSACTION DATASET TABLE
          ========================================================================= */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 20px rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
            <thead>
              <tr style={{ background: "#FFFFFF", borderBottom: "1.5px solid #E2E8F0" }}>
                <th
                  style={{
                    padding: "16px 20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  TRANSACTION
                </th>
                <th
                  style={{
                    padding: "16px 16px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  FROM
                </th>
                <th
                  style={{
                    padding: "16px 16px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  TO
                </th>
                <th
                  style={{
                    padding: "16px 16px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  AMOUNT
                </th>
                <th
                  style={{
                    padding: "16px 16px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  REAL HISTORY
                </th>
                <th
                  style={{
                    padding: "16px 16px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  AI SAYS
                </th>
                <th
                  style={{
                    padding: "16px 16px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  RESULT
                </th>
                <th
                  style={{
                    padding: "16px 16px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  STATUS
                </th>
                <th
                  style={{
                    padding: "16px 20px",
                    fontSize: "11px",
                    fontWeight: "700",
                    color: "#64748B",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    textAlign: "right",
                  }}
                >
                  &nbsp;
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#64748B", fontSize: "14px" }}>
                    Loading transactions from ledger...
                  </td>
                </tr>
              ) : sortedRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#64748B", fontSize: "14px" }}>
                    No transactions match your search criteria.
                  </td>
                </tr>
              ) : (
                sortedRecords.map((r, index) => {
                  const isFirstTime = r.actual_receiver_type === "FIRST_TIME_RECEIVER";
                  const isDiscrepancy = r.is_discrepancy;
                  const isFraud = Boolean(r.is_fraud);

                  // Check if recipient is blocked
                  const isReceiverBlocked =
                    r.receiver_name?.toLowerCase().includes("blocked") ||
                    r.receiver_account === "A0091" ||
                    r.receiver_name?.toLowerCase().includes("suspended");

                  const receiverCategoryLabel = isReceiverBlocked
                    ? "Blocked account"
                    : r.receiver_relationship_type || r.relationship_type || "Recipient";

                  const fromColor = getAvatarColor(r.sender_account + (r.sender_name || ""));
                  const toColor = getAvatarColor(r.receiver_account + (r.receiver_name || ""));

                  return (
                    <tr
                      key={r.transaction_id || index}
                      onClick={() => openAuditModal(r)}
                      style={{
                        borderBottom: "1px solid #F1F5F9",
                        borderLeft: isFraud
                          ? "3px solid #EF4444"
                          : isDiscrepancy
                          ? "3.5px solid #F59E0B"
                          : "3px solid transparent",
                        cursor: "pointer",
                        background: isFraud ? "#FEF2F2" : isDiscrepancy ? "#FFFDFD" : "#FFFFFF",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isFraud
                          ? "#FEE2E2"
                          : isDiscrepancy
                          ? "#FEF2F2"
                          : "#F8FAFC";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = isFraud
                          ? "#FEF2F2"
                          : isDiscrepancy
                          ? "#FFFDFD"
                          : "#FFFFFF";
                      }}
                    >
                      {/* TRANSACTION ID & TIME */}
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: "700", color: "#0F172A", fontSize: "12.5px" }}>
                          {r.transaction_id}
                        </div>
                        <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                          {formatTableDate(r.timestamp)}
                        </div>
                      </td>

                      {/* FROM (SENDER) */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: fromColor,
                              color: "#FFFFFF",
                              fontSize: "11px",
                              fontWeight: "700",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(r.sender_name, r.sender_account)}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", color: "#0F172A", fontSize: "13px", lineHeight: 1.2 }}>
                              {r.sender_name && r.sender_name !== "Name not available"
                                ? r.sender_name
                                : r.sender_account}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748B", marginTop: "2px" }}>
                              {r.sender_account}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* TO (RECEIVER) */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div
                            style={{
                              width: "30px",
                              height: "30px",
                              borderRadius: "50%",
                              background: toColor,
                              color: "#FFFFFF",
                              fontSize: "11px",
                              fontWeight: "700",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(r.receiver_name, r.receiver_account)}
                          </div>
                          <div>
                            <div style={{ fontWeight: "700", color: "#0F172A", fontSize: "13px", lineHeight: 1.2 }}>
                              {r.receiver_name && r.receiver_name !== "Name not available"
                                ? r.receiver_name
                                : r.receiver_account}
                            </div>
                            <div style={{ fontSize: "11px", marginTop: "2px", color: "#64748B" }}>
                              <span>{r.receiver_account}</span>
                              <span style={{ margin: "0 4px" }}>·</span>
                              <span
                                style={{
                                  color: isReceiverBlocked ? "#DC2626" : "#64748B",
                                  fontWeight: isReceiverBlocked ? "700" : "500",
                                }}
                              >
                                {receiverCategoryLabel}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* AMOUNT */}
                      <td style={{ padding: "14px 16px" }}>
                        <div style={{ fontWeight: "800", color: "#0F172A", fontSize: "13.5px" }}>
                          ₹{r.amount?.toLocaleString("en-IN")}
                        </div>
                      </td>

                      {/* REAL HISTORY */}
                      <td style={{ padding: "14px 16px" }}>
                        {isFirstTime ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              background: "#FEF3C7",
                              color: "#B45309",
                              whiteSpace: "nowrap",
                            }}
                          >
                            No past payments
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              background: "#DCFCE7",
                              color: "#15803D",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {r.actual_prior_count || 1} past payments
                          </span>
                        )}
                      </td>

                      {/* AI SAYS */}
                      <td style={{ padding: "14px 16px" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "4px 10px",
                            borderRadius: "12px",
                            fontSize: "11.5px",
                            fontWeight: "700",
                            background:
                              r.model_predicted_type === "FIRST_TIME_RECEIVER"
                                ? "#F5F3FF"
                                : "#EEF2FF",
                            color:
                              r.model_predicted_type === "FIRST_TIME_RECEIVER"
                                ? "#6D28D9"
                                : "#4F46E5",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {r.model_predicted_type === "FIRST_TIME_RECEIVER"
                            ? "New receiver"
                            : "Known receiver"}
                        </span>
                      </td>

                      {/* RESULT (Match vs Mismatch) */}
                      <td style={{ padding: "14px 16px" }}>
                        {isDiscrepancy ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              background: "#FEE2E2",
                              color: "#DC2626",
                              whiteSpace: "nowrap",
                            }}
                          >
                            ! Mismatch
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              background: "#DCFCE7",
                              color: "#16A34A",
                              whiteSpace: "nowrap",
                            }}
                          >
                            <FaCheck size={10} /> Match
                          </span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td style={{ padding: "14px 16px" }}>
                        {isFraud ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              background: "#FEE2E2",
                              color: "#DC2626",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Fraud
                          </span>
                        ) : r.status === "FLAGGED" ? (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              background: "#FEF3C7",
                              color: "#D97706",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Suspicious
                          </span>
                        ) : (
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "12px",
                              fontSize: "11.5px",
                              fontWeight: "700",
                              background: "#DCFCE7",
                              color: "#16A34A",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Safe
                          </span>
                        )}
                        <div style={{ fontSize: "10.5px", color: "#64748B", marginTop: "3px", fontWeight: "500" }}>
                          Risk {Math.round(r.risk_score ?? 0)}
                        </div>
                      </td>

                      {/* DETAILS BUTTON */}
                      <td style={{ padding: "14px 20px", textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openAuditModal(r);
                          }}
                          style={{
                            padding: "4px 14px",
                            borderRadius: "8px",
                            border: "1px solid #BFDBFE",
                            background: "#EFF6FF",
                            color: "#2563EB",
                            fontSize: "12px",
                            fontWeight: "700",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#DBEAFE")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "#EFF6FF")}
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION BAR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid #F1F5F9",
            flexWrap: "wrap",
            gap: "14px",
            background: "#FAFAFA",
          }}
        >
          {/* LEFT: RESULTS RANGE */}
          <div style={{ fontSize: "13px", color: "#64748B", fontWeight: "500" }}>
            Showing{" "}
            <span style={{ fontWeight: "700", color: "#0F172A" }}>
              {totalMatching === 0 ? 0 : (page - 1) * limit + 1}
            </span>{" "}
            to{" "}
            <span style={{ fontWeight: "700", color: "#0F172A" }}>
              {Math.min(page * limit, totalMatching)}
            </span>{" "}
            of{" "}
            <span style={{ fontWeight: "700", color: "#2563EB" }}>
              {totalMatching.toLocaleString()}
            </span>{" "}
            transactions
          </div>

          {/* RIGHT: ROWS PER PAGE + PAGE NAV CONTROLS */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
            {/* ROWS PER PAGE SELECT */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "12.5px", color: "#64748B", fontWeight: "600" }}>
                Rows per page:
              </span>
              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  setPage(1);
                }}
                style={{
                  border: "1px solid #CBD5E1",
                  borderRadius: "8px",
                  padding: "5px 10px",
                  fontSize: "12.5px",
                  fontWeight: "600",
                  color: "#0F172A",
                  background: "#FFFFFF",
                  cursor: "pointer",
                  outline: "none",
                }}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>

            {/* PAGE CONTROLS */}
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* FIRST PAGE */}
              <button
                type="button"
                onClick={() => setPage(1)}
                disabled={page <= 1 || loading}
                title="First Page"
                style={{
                  border: "1px solid #E2E8F0",
                  background: page <= 1 ? "#F8FAFC" : "#FFFFFF",
                  color: page <= 1 ? "#94A3B8" : "#334155",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  cursor: page <= 1 || loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <FaAngleDoubleLeft size={11} />
              </button>

              {/* PREV PAGE */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                title="Previous Page"
                style={{
                  border: "1px solid #E2E8F0",
                  background: page <= 1 ? "#F8FAFC" : "#FFFFFF",
                  color: page <= 1 ? "#94A3B8" : "#334155",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: page <= 1 || loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                <FaChevronLeft size={10} /> Prev
              </button>

              {/* CURRENT PAGE BADGE */}
              <div
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  background: "#EFF6FF",
                  border: "1px solid #BFDBFE",
                  color: "#1D4ED8",
                  fontSize: "12px",
                  fontWeight: "700",
                  minWidth: "90px",
                  textAlign: "center",
                }}
              >
                Page {page} of {totalPages}
              </div>

              {/* NEXT PAGE */}
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
                title="Next Page"
                style={{
                  border: "1px solid #E2E8F0",
                  background: page >= totalPages ? "#F8FAFC" : "#FFFFFF",
                  color: page >= totalPages ? "#94A3B8" : "#334155",
                  borderRadius: "8px",
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: page >= totalPages || loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  transition: "all 0.15s ease",
                }}
              >
                Next <FaChevronRight size={10} />
              </button>

              {/* LAST PAGE */}
              <button
                type="button"
                onClick={() => setPage(totalPages)}
                disabled={page >= totalPages || loading}
                title="Last Page"
                style={{
                  border: "1px solid #E2E8F0",
                  background: page >= totalPages ? "#F8FAFC" : "#FFFFFF",
                  color: page >= totalPages ? "#94A3B8" : "#334155",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "11px",
                  cursor: page >= totalPages || loading ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.15s ease",
                }}
              >
                <FaAngleDoubleRight size={11} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. ROW-LEVEL LEDGER AUDIT & VERIFICATION MODAL
          ========================================================================= */}
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
              background: "#FFFFFF",
              borderRadius: "20px",
              maxWidth: "680px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              border: "1px solid #E2E8F0",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
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
                type="button"
                onClick={closeAuditModal}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: "50%",
                  width: "30px",
                  height: "30px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748B",
                }}
              >
                <FaTimes size={13} />
              </button>
            </div>

            {/* MODAL BODY */}
            <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "18px" }}>
              {/* CONFIRMED FRAUD BANNER */}
              {selectedAuditRecord.is_fraud && (
                <div
                  style={{
                    background: "#FEF2F2",
                    border: "1.5px solid #EF4444",
                    borderRadius: "12px",
                    padding: "14px 18px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <FaShieldAlt color="#DC2626" size={20} style={{ flexShrink: 0 }} />
                    <div>
                      <strong style={{ color: "#991B1B", fontSize: "14px" }}>
                        This payment was marked as fraud and blocked.
                      </strong>
                      <p style={{ margin: "2px 0 0", color: "#B91C1C", fontSize: "12px" }}>
                        Blocked by the automated fraud detection system.
                      </p>
                    </div>
                  </div>
                  <div
                    style={{
                      background: "#DC2626",
                      color: "#FFFFFF",
                      padding: "5px 12px",
                      borderRadius: "14px",
                      fontSize: "12px",
                      fontWeight: "800",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Risk {Math.round(selectedAuditRecord.risk_score ?? 96)}
                  </div>
                </div>
              )}

              {/* DISCREPANCY WARNING */}
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
                  padding: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase" }}>
                    Sender Account
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#0F172A", marginTop: "2px" }}>
                    {selectedAuditRecord.sender_account}
                  </div>
                  {Boolean(selectedAuditRecord.sender_name && selectedAuditRecord.sender_name.trim()) && (
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      {selectedAuditRecord.sender_name}
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#2563EB", fontWeight: "600", marginTop: "2px" }}>
                    Trust Score: {selectedAuditRecord.sender_trust_score || 85}/100
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
                  <div style={{ fontSize: "16px", fontWeight: "800", color: "#0F172A", marginTop: "2px" }}>
                    {selectedAuditRecord.receiver_account}
                  </div>
                  {Boolean(selectedAuditRecord.receiver_name && selectedAuditRecord.receiver_name.trim()) && (
                    <div style={{ fontSize: "12px", color: "#475569" }}>
                      {selectedAuditRecord.receiver_name}
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#0D9488", fontWeight: "600", marginTop: "2px" }}>
                    Trust Score: {selectedAuditRecord.receiver_trust_score || 80}/100
                  </div>
                </div>
              </div>

              {/* AUDIT BREAKDOWN METRICS */}
              <div>
                <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: "800", color: "#0F172A" }}>
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
                        fontSize: "13.5px",
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
                        : "No previous transaction in ledger"}
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
                    <div style={{ fontSize: "12px", color: "#64748B" }}>Last Known Amount</div>
                    <div style={{ fontSize: "14px", fontWeight: "800", color: "#0F172A", marginTop: "4px" }}>
                      {selectedAuditRecord.last_transfer_amount
                        ? `₹${selectedAuditRecord.last_transfer_amount.toLocaleString("en-IN")}`
                        : "N/A (First Transfer)"}
                    </div>
                  </div>
                </div>
              </div>

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
                  type="button"
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
                    type="button"
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
                      color: "#FFFFFF",
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
