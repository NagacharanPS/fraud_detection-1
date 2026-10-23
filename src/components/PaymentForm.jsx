import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaChevronDown,
  FaChevronUp,
  FaShieldAlt,
  FaLock,
  FaUserCheck,
  FaUserPlus,
  FaArrowRight,
  FaExclamationTriangle,
  FaProjectDiagram,
  FaBolt,
  FaSearch,
  FaCheck,
  FaTimes,
  FaExchangeAlt,
} from "react-icons/fa";
import api from "../api";
import { collectDeviceSignals } from "../utils/deviceTrust";
import DeviceSecurityModal from "./DeviceSecurityModal";
import GroundedEvidenceView from "./GroundedEvidenceView";

function getNowLocalTimeString() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const yyyy = parts.find((p) => p.type === "year")?.value || now.getFullYear();
    const mm = parts.find((p) => p.type === "month")?.value || pad(now.getMonth() + 1);
    const dd = parts.find((p) => p.type === "day")?.value || pad(now.getDate());
    const hh = parts.find((p) => p.type === "hour")?.value || pad(now.getHours());
    const min = parts.find((p) => p.type === "minute")?.value || pad(now.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  } catch {
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
}

function formatDisplayDateTime(isoOrLocalString) {
  if (!isoOrLocalString) return "";
  const d = new Date(isoOrLocalString);
  if (isNaN(d.getTime())) return isoOrLocalString;
  const day = d.getDate();
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const hoursStr = String(hours).padStart(2, "0");
  return `${day} ${month} ${year}, ${hoursStr}:${minutes} ${ampm}`;
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

function PaymentForm({ selectedScenario, onResetScenario, onViewInGraph }) {
  const navigate = useNavigate();

  /* ----------------------------- STATES ----------------------------- */

  const [senderSearch, setSenderSearch] = useState("");
  const [receiverSearch, setReceiverSearch] = useState("");

  const [selectedSender, setSelectedSender] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState(null);

  const [senderFilter, setSenderFilter] = useState("ALL");
  const [receiverFilter, setReceiverFilter] = useState("ALL");

  const [accounts, setAccounts] = useState([]);
  const [amount, setAmount] = useState("");

  // Dynamic Device Trust
  const [deviceTrust, setDeviceTrust] = useState(null);
  const [showDeviceModal, setShowDeviceModal] = useState(false);

  // Contextual Risk Controls & Automated Ledger Lookup
  const [isNewReceiver, setIsNewReceiver] = useState(false);
  const [transactionsLast10Min, setTransactionsLast10Min] = useState(0);
  const [relationshipInfo, setRelationshipInfo] = useState(null);
  const [loadingRelationship, setLoadingRelationship] = useState(false);

  // Transaction time – default to current local Indian time (Asia/Kolkata)
  const [transactionTime, setTransactionTime] = useState(getNowLocalTimeString);
  const [scenarioTimeNote, setScenarioTimeNote] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [checkingRisk, setCheckingRisk] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Account selector modal / picker states
  const [showSenderPicker, setShowSenderPicker] = useState(false);
  const [showReceiverPicker, setShowReceiverPicker] = useState(false);

  const [error, setError] = useState("");
  const [receiverError, setReceiverError] = useState("");
  const [senderError, setSenderError] = useState("");
  const [riskData, setRiskData] = useState(null);
  const [authType, setAuthType] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionColor, setActionColor] = useState("");
  const [buttonText, setButtonText] = useState("");

  // Trace modal states
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [traceData, setTraceData] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(false);
  const [expandedReasons, setExpandedReasons] = useState({});

  const toggleReasonExpand = (ruleCode) => {
    setExpandedReasons((prev) => ({
      ...prev,
      [ruleCode]: !prev[ruleCode],
    }));
  };

  // Evaluate Device Signals
  useEffect(() => {
    runDeviceAssessment();
  }, [selectedSender?.account_id]);

  async function runDeviceAssessment() {
    try {
      const senderId = selectedSender?.account_id || "A0001";
      const result = await collectDeviceSignals(senderId, "GENUINE");
      setDeviceTrust(result);
      return result;
    } catch (err) {
      console.error("Device evaluation error:", err);
      return null;
    }
  }

  /* ----------------------------- LOAD ACCOUNTS ----------------------------- */

  useEffect(() => {
    loadAccounts();
  }, []);

  async function loadAccounts() {
    try {
      setLoadingAccounts(true);
      const res = await api.get("/api/accounts");
      setAccounts(res.data);
      if (res.data.length >= 2) {
        setSelectedSender(res.data[0]);
        setSenderSearch(res.data[0].account_id);
        setSelectedReceiver(res.data[1]);
        setReceiverSearch(res.data[1].account_id);
      }
      setLoadingAccounts(false);
    } catch (err) {
      setLoadingAccounts(false);
      console.log(err);
    }
  }

  // Handle Scenario pre-fill
  useEffect(() => {
    if (!selectedScenario || accounts.length === 0) return;

    const senderAcc = accounts.find((a) => a.account_id === selectedScenario.sender);
    const receiverAcc = accounts.find((a) => a.account_id === selectedScenario.receiver);

    if (senderAcc) {
      setSelectedSender(senderAcc);
      setSenderSearch(senderAcc.account_id);
      setSenderError("");
    }
    if (receiverAcc) {
      setSelectedReceiver(receiverAcc);
      setReceiverSearch(receiverAcc.account_id);
      setReceiverError("");
    }
    if (selectedScenario.amount !== undefined) {
      setAmount(String(selectedScenario.amount));
    }
    if (selectedScenario.isNewReceiver !== undefined) {
      setIsNewReceiver(Boolean(selectedScenario.isNewReceiver));
    }
    if (selectedScenario.transactionsLast10Min !== undefined) {
      setTransactionsLast10Min(Number(selectedScenario.transactionsLast10Min));
    }
    if (selectedScenario.time) {
      setTransactionTime(selectedScenario.time);
      if (selectedScenario.id?.includes("high") || selectedScenario.id?.includes("crit")) {
        setScenarioTimeNote("This scenario uses a late-night transaction time to demonstrate unusual activity.");
      } else {
        setScenarioTimeNote("");
      }
    } else {
      setTransactionTime(getNowLocalTimeString());
      setScenarioTimeNote("");
    }
    setError("");
    setReceiverError("");
    setSenderError("");
    setRiskData(null);
    setAuthType("");
    setActionTitle("");
    setActionColor("");
    setButtonText("");
  }, [selectedScenario, accounts]);

  // Automated Ledger / Dataset Lookup for Receiver Relationship
  useEffect(() => {
    if (!selectedSender?.account_id || !selectedReceiver?.account_id) {
      setRelationshipInfo(null);
      return;
    }

    if (selectedSender.account_id === selectedReceiver.account_id) {
      setRelationshipInfo(null);
      return;
    }

    let isMounted = true;
    async function fetchLedgerRelationship() {
      try {
        setLoadingRelationship(true);
        const res = await api.get("/api/ledger/receiver-status", {
          params: {
            sender_id: selectedSender.account_id,
            receiver_id: selectedReceiver.account_id,
          },
        });
        if (!isMounted) return;
        const data = res.data;
        setRelationshipInfo(data);
        // Only update receiver flag automatically if not actively loaded from a demo scenario
        if (!selectedScenario) {
          setIsNewReceiver(Boolean(data.is_new_receiver));
          if (data.is_new_receiver) {
            setTransactionsLast10Min(0);
          }
        }
        setLoadingRelationship(false);
      } catch (err) {
        if (!isMounted) return;
        console.warn("Ledger relationship query fallback:", err);
        setLoadingRelationship(false);
      }
    }

    fetchLedgerRelationship();

    return () => {
      isMounted = false;
    };
  }, [selectedSender?.account_id, selectedReceiver?.account_id, selectedScenario]);

  /* ----------------------------- FILTERED LISTS ----------------------------- */

  const filteredSenderAccounts = useMemo(() => {
    if (senderFilter === "ALL") return accounts;
    return accounts.filter((item) => item.relationship_type === senderFilter);
  }, [accounts, senderFilter]);

  const filteredReceiverAccounts = useMemo(() => {
    if (receiverFilter === "ALL") return accounts;
    return accounts.filter((item) => item.relationship_type === receiverFilter);
  }, [accounts, receiverFilter]);

  const senderResults = useMemo(() => {
    if (!senderSearch.trim()) return filteredSenderAccounts;
    const q = senderSearch.toLowerCase();
    return filteredSenderAccounts.filter(
      (item) =>
        item.account_id.toLowerCase().includes(q) ||
        (item.account_name && item.account_name.toLowerCase().includes(q)) ||
        (item.upi_id && item.upi_id.toLowerCase().includes(q)) ||
        (item.mobile_number && item.mobile_number.includes(q))
    );
  }, [senderSearch, filteredSenderAccounts]);

  const receiverResults = useMemo(() => {
    if (!receiverSearch.trim()) return filteredReceiverAccounts;
    const q = receiverSearch.toLowerCase();
    return filteredReceiverAccounts.filter(
      (item) =>
        item.account_id.toLowerCase().includes(q) ||
        (item.account_name && item.account_name.toLowerCase().includes(q)) ||
        (item.upi_id && item.upi_id.toLowerCase().includes(q)) ||
        (item.mobile_number && item.mobile_number.includes(q))
    );
  }, [receiverSearch, filteredReceiverAccounts]);

  /* ----------------------------- HANDLERS ----------------------------- */

  function clearAssessmentResults() {
    setRiskData(null);
    setAuthType("");
    setActionTitle("");
    setActionColor("");
    setButtonText("");
    setError("");
  }

  function selectSender(account) {
    setSelectedSender(account);
    setSenderSearch(account.account_id);
    setSenderError("");
    setShowSenderPicker(false);
    clearAssessmentResults();
    if (onResetScenario) onResetScenario();
  }

  function selectReceiver(account) {
    setSelectedReceiver(account);
    setReceiverSearch(account.account_id);
    setReceiverError("");
    setShowReceiverPicker(false);
    clearAssessmentResults();
    if (onResetScenario) onResetScenario();
  }

  function swapSenderReceiver() {
    if (!selectedSender || !selectedReceiver) return;
    const tempSender = selectedSender;
    setSelectedSender(selectedReceiver);
    setSenderSearch(selectedReceiver.account_id);
    setSelectedReceiver(tempSender);
    setReceiverSearch(tempSender.account_id);
    clearAssessmentResults();
    if (onResetScenario) onResetScenario();
  }

  function handleAmountChange(val) {
    setAmount(val);
    clearAssessmentResults();
    if (Number(val) > 0 && (error === "Invalid Amount" || error === "Enter Amount")) {
      setError("");
    }
  }

  function validateForm() {
    clearAssessmentResults();

    if (!selectedSender) {
      setError("Please select a Sender account");
      setSenderError("Sender account is required");
      return false;
    }
    if (!selectedReceiver) {
      setError("Please select a Receiver account");
      setReceiverError("Receiver account is required");
      return false;
    }
    if (selectedSender.account_id === selectedReceiver.account_id) {
      setError("Sender and Receiver cannot be the same account.");
      return false;
    }
    if (!amount || String(amount).trim() === "") {
      setError("Please enter a valid transfer amount.");
      return false;
    }
    if (Number(amount) <= 0) {
      setError("Amount must be greater than zero.");
      return false;
    }
    if (!transactionTime) {
      setError("Please select a transaction time.");
      return false;
    }
    setError("");
    setReceiverError("");
    setSenderError("");
    return true;
  }

  /* ----------------------------- CHECK RISK ----------------------------- */

  async function checkRisk() {
    if (!validateForm()) return;
    try {
      setCheckingRisk(true);
      setError("");

      let currentDeviceTrust = deviceTrust;
      if (!currentDeviceTrust) {
        currentDeviceTrust = await runDeviceAssessment();
      }

      const payload = {
        sender_account: selectedSender.account_id,
        receiver_account: selectedReceiver.account_id,
        amount: Number(amount),
        is_new_device: false,
        is_new_receiver: isNewReceiver,
        transactions_last_10min: Number(transactionsLast10Min) || 0,
        transaction_time: transactionTime,
        device_trust: currentDeviceTrust,
      };
      const response = await api.post("/api/check-risk", payload);
      const data = response.data;

      if (data.error === "INSUFFICIENT_BALANCE") {
        setRiskData({
          insufficientBalance: true,
          available_balance: data.available_balance,
          requested_amount: data.requested_amount,
        });
        setCheckingRisk(false);
        return;
      }
      setRiskData(data);
      decideAuthentication(data.risk_score, data.authentication, data.recommendation);
      setCheckingRisk(false);
    } catch (err) {
      setCheckingRisk(false);
      if (err.response?.data?.error === "INSUFFICIENT_BALANCE") {
        setError("");
        setRiskData({
          insufficientBalance: true,
          available_balance: err.response.data.available_balance,
          requested_amount: err.response.data.requested_amount,
        });
        return;
      }
      setError(err.response?.data?.message || "Unable to calculate risk.");
    }
  }

  /* ----------------------------- AUTH DECISION ----------------------------- */

  function decideAuthentication(score, authRequirement, recommendation) {
    if (authRequirement === "BLOCKED" || recommendation === "BLOCK" || score > 85) {
      setAuthType("BLOCK");
      setActionTitle("Transaction Temporarily Frozen / Blocked");
      setButtonText("Security Freeze Active");
      setActionColor("#DC2626");
    } else if (authRequirement === "FACE" || recommendation === "STEP_UP_FACE" || score > 60) {
      setAuthType("FACE");
      setActionTitle("Adaptive Face Verification Required");
      setButtonText("Verify Biometrics / Face");
      setActionColor("#2563EB");
    } else if (authRequirement === "OTP" || recommendation === "VERIFY_OTP" || score > 30) {
      setAuthType("OTP");
      setActionTitle("OTP Verification Required");
      setButtonText("Send SMS OTP");
      setActionColor("#F59E0B");
    } else {
      setAuthType("LOW");
      setActionTitle("Low Risk — Proceed with Transaction");
      setButtonText("Complete Payment");
      setActionColor("#16A34A");
    }
  }

  /* ----------------------------- FINAL PAYMENT ----------------------------- */

  function handleActionClick() {
    if (!validateForm()) return;
    if (authType === "BLOCK") {
      setError("Transaction is BLOCKED by AI Fraud Engine due to critical risk factors.");
      return;
    }
    setShowDeviceModal(true);
  }

  async function completeTransaction() {
    if (!validateForm() || processingPayment) return;
    try {
      setProcessingPayment(true);
      setError("");
      const payload = {
        sender_account: selectedSender.account_id,
        receiver_account: selectedReceiver.account_id,
        amount: Number(amount),
        is_new_device: false,
        is_new_receiver: isNewReceiver,
        transactions_last_10min: Number(transactionsLast10Min) || 0,
        transaction_time: transactionTime,
        device_trust: deviceTrust,
      };
      const res = await api.post("/api/payment", payload);

      setShowDeviceModal(false);
      setProcessingPayment(false);

      if (res.data.decision === "BLOCKED" || res.data.status === "BLOCKED") {
        setError("Transaction BLOCKED by AI Fraud Engine due to critical risk factors.");
        setRiskData(res.data.ai_analysis || res.data);
        return;
      }

      try {
        localStorage.setItem("last_successful_payment", JSON.stringify(res.data));
      } catch (storageErr) {
        console.warn("Could not save to localStorage:", storageErr);
      }

      navigate("/payment-success", { state: res.data });
    } catch (err) {
      setShowDeviceModal(false);
      setProcessingPayment(false);
      if (err.response?.status === 403 || err.response?.data?.error === "TRANSACTION_BLOCKED") {
        const blockedData = err.response.data;
        setError(blockedData.message || "Transaction BLOCKED by AI Fraud Engine.");
        if (blockedData.ai_analysis) {
          setRiskData(blockedData.ai_analysis);
        } else {
          setRiskData({
            risk_score: blockedData.risk_score || 87,
            risk_level: blockedData.risk_level || "CRITICAL",
            reasons: blockedData.reasons || ["Blocked by AI Fraud Detection System."],
            prediction: blockedData.prediction || "FRAUD",
          });
        }
        return;
      }
      setError(err.response?.data?.message || "Payment Failed");
    }
  }

  /* ----------------------------- TRACE TRANSACTION ----------------------------- */

  async function fetchTraceData(transactionId) {
    try {
      setLoadingTrace(true);
      const res = await api.get(`/api/risk-log/${transactionId}`);
      setTraceData(res.data);
      setShowTraceModal(true);
      setLoadingTrace(false);
    } catch (err) {
      setLoadingTrace(false);
      console.error(err);
      alert("Failed to fetch transaction trace data.");
    }
  }

  // Quick select amounts matching the uploaded UI
  const quickAmounts = [500, 2000, 10000, 50000];

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "680px",
        margin: "0 auto",
        background: "#FFFFFF",
        borderRadius: "28px",
        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08), 0 4px 20px rgba(0, 0, 0, 0.04)",
        overflow: "hidden",
        border: "1px solid #E2E8F0",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* =========================================================================
          1. HEADER BANNER: SEND MONEY WITH SHIELD ICON
          ========================================================================= */}
      <div
        style={{
          background: "linear-gradient(135deg, #1D3A8A 0%, #2563EB 50%, #6366F1 100%)",
          padding: "24px 28px 46px 28px",
          color: "#FFFFFF",
          display: "flex",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "14px",
            background: "rgba(255, 255, 255, 0.16)",
            border: "1px solid " + "rgba(255, 255, 255, 0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "20px",
            color: "#FFFFFF",
            flexShrink: 0,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
          }}
        >
          <FaShieldAlt />
        </div>
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
            Send Money
          </h2>
          <p
            style={{
              margin: "3px 0 0",
              fontSize: "13px",
              color: "rgba(255, 255, 255, 0.85)",
              fontWeight: "400",
            }}
          >
            AI risk analysis runs before every transfer
          </p>
        </div>
      </div>

      {/* =========================================================================
          2. FLOATING SENDER & RECEIVER BOX OVERLAY
          ========================================================================= */}
      <div
        style={{
          padding: "0 24px",
          marginTop: "-26px",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "20px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
            padding: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            position: "relative",
          }}
        >
          {/* FROM • SENDER CARD */}
          <div
            style={{
              flex: 1,
              background: "#FFFFFF",
              border: senderError ? "1.5px solid #EF4444" : "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              transition: "border-color 0.2s ease",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#64748B",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              FROM • SENDER
            </div>

            <div
              onClick={() => setShowSenderPicker(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
              title="Click to change sender"
            >
              {/* AVATAR */}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "#3B82F6",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(59, 130, 246, 0.3)",
                }}
              >
                {getInitials(selectedSender?.account_name, selectedSender?.account_id || "A0001")}
              </div>

              {/* ID & NAME */}
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "800",
                    color: "#0F172A",
                    lineHeight: 1.2,
                  }}
                >
                  {selectedSender?.account_id || "A0001"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "140px",
                    marginTop: "2px",
                  }}
                >
                  {selectedSender?.account_name || "Rahul Sharma"}
                </div>
              </div>
            </div>

            {/* FILTER PILL */}
            <div style={{ marginTop: "2px" }}>
              <button
                type="button"
                onClick={() => setShowSenderPicker(true)}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#475569",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {senderFilter === "ALL" ? "All Types" : senderFilter} <FaChevronDown size={9} />
              </button>
            </div>
          </div>

          {/* SWAP / ARROW BUTTON */}
          <button
            type="button"
            onClick={swapSenderReceiver}
            title="Swap Sender and Receiver"
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #4F46E5, #6366F1)",
              border: "none",
              color: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "13px",
              cursor: "pointer",
              boxShadow: "0 4px 10px rgba(99, 102, 241, 0.35)",
              flexShrink: 0,
              transition: "transform 0.15s ease",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
          >
            <FaArrowRight />
          </button>

          {/* TO • RECEIVER CARD */}
          <div
            style={{
              flex: 1,
              background: "#FFFFFF",
              border: receiverError ? "1.5px solid #EF4444" : "1px solid #E2E8F0",
              borderRadius: "14px",
              padding: "12px 14px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              transition: "border-color 0.2s ease",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: "700",
                color: "#64748B",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              TO • RECEIVER
            </div>

            <div
              onClick={() => setShowReceiverPicker(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                cursor: "pointer",
              }}
              title="Click to change receiver"
            >
              {/* AVATAR */}
              <div
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "50%",
                  background: "#8B5CF6",
                  color: "#FFFFFF",
                  fontSize: "14px",
                  fontWeight: "700",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxShadow: "0 2px 6px rgba(139, 92, 246, 0.3)",
                }}
              >
                {getInitials(selectedReceiver?.account_name, selectedReceiver?.account_id || "A0002")}
              </div>

              {/* ID & NAME */}
              <div style={{ overflow: "hidden" }}>
                <div
                  style={{
                    fontSize: "15px",
                    fontWeight: "800",
                    color: "#0F172A",
                    lineHeight: 1.2,
                  }}
                >
                  {selectedReceiver?.account_id || "A0002"}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "140px",
                    marginTop: "2px",
                  }}
                >
                  {selectedReceiver?.account_name || "Charan Nair"}
                </div>
              </div>
            </div>

            {/* FILTER PILL */}
            <div style={{ marginTop: "2px" }}>
              <button
                type="button"
                onClick={() => setShowReceiverPicker(true)}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "8px",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: "600",
                  color: "#475569",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                {receiverFilter === "ALL" ? "All Types" : receiverFilter} <FaChevronDown size={9} />
              </button>
            </div>
          </div>
        </div>

        {/* ERROR MESSAGES FOR SENDER OR RECEIVER */}
        {(senderError || receiverError) && (
          <div
            style={{
              marginTop: "8px",
              padding: "8px 12px",
              borderRadius: "8px",
              background: "#FEE2E2",
              color: "#DC2626",
              fontSize: "12px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <FaExclamationTriangle /> {senderError || receiverError}
          </div>
        )}
      </div>

      {/* =========================================================================
          3. MAIN FORM BODY
          ========================================================================= */}
      <div
        style={{
          padding: "24px 28px 30px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "22px",
        }}
      >
        {/* AMOUNT SECTION */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: "8px",
            }}
          >
            Amount
          </label>

          {/* LARGE AMOUNT INPUT BOX */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#FFFFFF",
              border: "1.5px solid #E2E8F0",
              borderRadius: "16px",
              padding: "12px 18px",
              transition: "border-color 0.2s ease, box-shadow 0.2s ease",
            }}
          >
            <span
              style={{
                fontSize: "30px",
                fontWeight: "800",
                color: amount ? "#0F172A" : "#94A3B8",
                marginRight: "8px",
                userSelect: "none",
              }}
            >
              ₹
            </span>
            <input
              type="number"
              value={amount}
              onChange={(e) => handleAmountChange(e.target.value)}
              placeholder="0.00"
              style={{
                border: "none",
                outline: "none",
                fontSize: "30px",
                fontWeight: "800",
                color: "#0F172A",
                width: "100%",
                background: "transparent",
                fontFamily: "'Inter', sans-serif",
              }}
            />
          </div>

          {/* QUICK-SELECT PILLS */}
          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "12px",
              flexWrap: "wrap",
            }}
          >
            {quickAmounts.map((qVal) => {
              const isSelected = Number(amount) === qVal;
              return (
                <button
                  key={qVal}
                  type="button"
                  onClick={() => handleAmountChange(String(qVal))}
                  style={{
                    background: isSelected ? "#DBEAFE" : "#EFF6FF",
                    border: isSelected ? "1px solid #3B82F6" : "1px solid transparent",
                    borderRadius: "20px",
                    padding: "8px 18px",
                    fontSize: "13px",
                    fontWeight: "700",
                    color: "#2563EB",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#DBEAFE")}
                  onMouseLeave={(e) => {
                    if (!isSelected) e.currentTarget.style.background = "#EFF6FF";
                  }}
                >
                  ₹{qVal.toLocaleString("en-IN")}
                </button>
              );
            })}
          </div>
        </div>

        {/* RECEIVER STATUS SECTION */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "10px",
            }}
          >
            <label
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: "700",
                color: "#0F172A",
              }}
            >
              Receiver status
            </label>

            <span
              style={{
                background: "#F3E8FF",
                color: "#7E22CE",
                fontSize: "11px",
                fontWeight: "700",
                padding: "3px 10px",
                borderRadius: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <FaBolt size={10} /> Auto-detected from ledger
            </span>
          </div>

          {/* TWO SELECTABLE OPTION CARDS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}
          >
            {/* EXISTING RECEIVER */}
            <div
              onClick={() => {
                setIsNewReceiver(false);
                clearAssessmentResults();
              }}
              style={{
                border: !isNewReceiver ? "2px solid #16A34A" : "1.5px solid #E2E8F0",
                borderRadius: "14px",
                background: !isNewReceiver ? "#F0FDF4" : "#FFFFFF",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: !isNewReceiver ? "0 4px 12px rgba(22, 163, 74, 0.15)" : "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#DCFCE7",
                  color: "#16A34A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                <FaUserCheck />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#0F172A",
                  }}
                >
                  Existing receiver
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginTop: "1px",
                  }}
                >
                  Paid before
                </div>
              </div>
            </div>

            {/* FIRST-TIME RECEIVER */}
            <div
              onClick={() => {
                setIsNewReceiver(true);
                clearAssessmentResults();
              }}
              style={{
                border: isNewReceiver ? "2px solid #F59E0B" : "1.5px solid #E2E8F0",
                borderRadius: "14px",
                background: isNewReceiver ? "#FFFBEB" : "#FFFFFF",
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: isNewReceiver ? "0 4px 12px rgba(245, 158, 11, 0.2)" : "none",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#FEF3C7",
                  color: "#D97706",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "16px",
                  flexShrink: 0,
                }}
              >
                <FaUserPlus />
              </div>
              <div>
                <div
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#0F172A",
                  }}
                >
                  First-time receiver
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748B",
                    marginTop: "1px",
                  }}
                >
                  No prior history
                </div>
              </div>
            </div>
          </div>

          {/* WARNING / ALERT BANNER */}
          {isNewReceiver ? (
            <div
              style={{
                marginTop: "12px",
                background: "#FFFBEB",
                border: "1px solid #FED7AA",
                borderRadius: "12px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                color: "#9A3412",
              }}
            >
              <FaExclamationTriangle color="#D97706" size={16} />
              <span>
                <strong>New receiver</strong> — you have never sent money to{" "}
                {selectedReceiver?.account_id || "this recipient"} before.
              </span>
            </div>
          ) : (
            <div
              style={{
                marginTop: "12px",
                background: "#F0FDF4",
                border: "1px solid #BBF7D0",
                borderRadius: "12px",
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                fontSize: "13px",
                color: "#166534",
              }}
            >
              <FaCheck color="#16A34A" size={14} />
              <span>
                <strong>Verified contact</strong> —{" "}
                {relationshipInfo && relationshipInfo.transaction_count > 0
                  ? `found ${relationshipInfo.transaction_count} prior completed payment(s) to ${selectedReceiver?.account_id}.`
                  : `ledger relationship recorded with ${selectedReceiver?.account_id}.`}
              </span>
            </div>
          )}
        </div>

        {/* TRANSACTIONS IN LAST 10 MINUTES (VELOCITY) */}
        {!isNewReceiver && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <label style={{ fontSize: "13px", fontWeight: "600", color: "#334155" }}>
                Recent transfer velocity (transactions in last 10 mins)
              </label>
              <span style={{ fontSize: "11px", color: "#64748B" }}>Default: 0</span>
            </div>
            <input
              type="number"
              min="0"
              value={transactionsLast10Min}
              onChange={(e) => setTransactionsLast10Min(e.target.value)}
              placeholder="0"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
                fontSize: "13.5px",
                outline: "none",
                background: "#FFFFFF",
              }}
            />
          </div>
        )}

        {/* TRANSACTION TIME SECTION */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "700",
              color: "#0F172A",
              marginBottom: "8px",
            }}
          >
            Transaction time
          </label>

          <div
            onClick={() => setShowTimePicker(!showTimePicker)}
            style={{
              border: "1.5px solid #E2E8F0",
              borderRadius: "14px",
              background: "#FFFFFF",
              padding: "13px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: "14px",
                fontWeight: "600",
                color: "#0F172A",
              }}
            >
              {formatDisplayDateTime(transactionTime)}
            </span>

            <span
              style={{
                background: "#F1F5F9",
                color: "#64748B",
                fontSize: "11px",
                fontWeight: "700",
                padding: "4px 10px",
                borderRadius: "6px",
              }}
            >
              IST
            </span>
          </div>

          {/* TOGGLEABLE NATIVE TIME PICKER */}
          {showTimePicker && (
            <div
              style={{
                marginTop: "8px",
                padding: "12px",
                background: "#F8FAFC",
                borderRadius: "10px",
                border: "1px solid #E2E8F0",
              }}
            >
              <label style={{ fontSize: "12px", fontWeight: "600", color: "#475569", display: "block", marginBottom: "6px" }}>
                Select custom simulation time:
              </label>
              <input
                type="datetime-local"
                value={transactionTime}
                onChange={(e) => {
                  setTransactionTime(e.target.value);
                  setScenarioTimeNote("");
                  clearAssessmentResults();
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  border: "1px solid #CBD5E1",
                  fontSize: "13px",
                  outline: "none",
                  background: "#FFFFFF",
                }}
              />
            </div>
          )}

          {scenarioTimeNote && (
            <div
              style={{
                marginTop: "8px",
                fontSize: "12px",
                color: "#4F46E5",
                fontWeight: "500",
                background: "#EEF2FF",
                padding: "8px 12px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "1px solid #C7D2FE",
              }}
            >
              <span>🌙</span> {scenarioTimeNote}
            </div>
          )}
        </div>

        {/* ERROR DISPLAY */}
        {error && (
          <div
            style={{
              background: "#FEE2E2",
              color: "#B91C1C",
              padding: "12px 16px",
              borderRadius: "12px",
              fontSize: "13px",
              fontWeight: "600",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <FaExclamationTriangle /> {error}
          </div>
        )}

        {/* PRIMARY SUBMIT BUTTON */}
        <button
          type="button"
          onClick={checkRisk}
          disabled={checkingRisk || processingPayment}
          style={{
            width: "100%",
            background: checkingRisk || processingPayment
              ? "#93C5FD"
              : "linear-gradient(90deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)",
            color: "#FFFFFF",
            border: "none",
            borderRadius: "16px",
            padding: "16px 24px",
            fontSize: "16px",
            fontWeight: "700",
            cursor: checkingRisk || processingPayment ? "not-allowed" : "pointer",
            boxShadow: "0 8px 24px rgba(79, 70, 229, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            transition: "all 0.2s ease",
            outline: "none",
          }}
          onMouseEnter={(e) => {
            if (!checkingRisk && !processingPayment) {
              e.currentTarget.style.boxShadow = "0 10px 28px rgba(79, 70, 229, 0.45)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }
          }}
          onMouseLeave={(e) => {
            if (!checkingRisk && !processingPayment) {
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(79, 70, 229, 0.35)";
              e.currentTarget.style.transform = "translateY(0)";
            }
          }}
        >
          <FaLock size={15} />
          {checkingRisk ? "Evaluating Synchronized AI Risk..." : "Check Transaction Risk"}
        </button>

        {/* =========================================================================
            4. RISK ASSESSMENT RESULTS SECTION
            ========================================================================= */}
        {riskData &&
          (riskData.insufficientBalance ? (
            <div
              style={{
                marginTop: "10px",
                border: "1px solid #FCA5A5",
                borderRadius: "16px",
                padding: "20px",
                background: "#FEF2F2",
                color: "#991B1B",
              }}
            >
              <h3 style={{ marginTop: 0, color: "#991B1B", fontSize: "16px" }}>
                Insufficient Balance
              </h3>
              <p style={{ margin: "4px 0", fontSize: "13px" }}>
                <strong>Available Balance:</strong> ₹{riskData.available_balance}
              </p>
              <p style={{ margin: "4px 0", fontSize: "13px" }}>
                <strong>Requested Amount:</strong> ₹{riskData.requested_amount}
              </p>
            </div>
          ) : (
            <div
              style={{
                marginTop: "10px",
                border: "1px solid #E2E8F0",
                borderRadius: "20px",
                padding: "22px",
                background: "#FFFFFF",
                boxShadow: "0 4px 16px rgba(0, 0, 0, 0.04)",
              }}
            >
              {/* HEADER WITH RISK LEVEL PILL */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <FaShieldAlt color="#2563EB" size={18} />
                  <h3 style={{ margin: 0, color: "#0F172A", fontSize: "17px", fontWeight: "700" }}>
                    AI Fraud Analysis
                  </h3>
                </div>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontWeight: "800",
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                    background:
                      riskData.risk_level === "CRITICAL"
                        ? "#FEE2E2"
                        : riskData.risk_level === "HIGH"
                        ? "#FFEDD5"
                        : riskData.risk_level === "MEDIUM"
                        ? "#FEF3C7"
                        : "#DCFCE7",
                    color:
                      riskData.risk_level === "CRITICAL"
                        ? "#991B1B"
                        : riskData.risk_level === "HIGH"
                        ? "#C2410C"
                        : riskData.risk_level === "MEDIUM"
                        ? "#B45309"
                        : "#15803D",
                  }}
                >
                  {riskData.risk_level} RISK
                </span>
              </div>

              {/* CORE METRICS GRID */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                  marginTop: "16px",
                  fontSize: "13px",
                  color: "#334155",
                }}
              >
                {riskData.receiver_name && riskData.receiver_name !== "Name not available" && (
                  <div>
                    <strong>Receiver:</strong> {riskData.receiver_name}
                  </div>
                )}
                <div>
                  <strong>Risk Score:</strong> {riskData.risk_score}%
                </div>
                <div>
                  <strong>Prediction:</strong> {riskData.prediction}
                </div>
                <div>
                  <strong>Fraud Probability:</strong> {(riskData.fraud_probability * 100).toFixed(1)}%
                </div>
                <div>
                  <strong>Authentication:</strong> {riskData.authentication}
                </div>
                <div>
                  <strong>Recommendation:</strong> {riskData.recommendation}
                </div>
              </div>

              {/* RISK FACTORS BREAKDOWN */}
              {riskData.risk_factors && (
                <div
                  style={{
                    marginTop: "16px",
                    background: "#F8FAFC",
                    padding: "14px",
                    borderRadius: "12px",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div style={{ fontSize: "12px", fontWeight: "700", color: "#334155", marginBottom: "8px" }}>
                    📊 Risk Factor Contribution Breakdown:
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "11px", padding: "4px 8px", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Amount: <strong>{riskData.risk_factors.amount_risk} pts</strong>
                    </span>
                    <span style={{ fontSize: "11px", padding: "4px 8px", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Velocity: <strong>{riskData.risk_factors.velocity_risk} pts</strong>
                    </span>
                    <span style={{ fontSize: "11px", padding: "4px 8px", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Device: <strong>{riskData.risk_factors.device_risk} pts</strong>
                    </span>
                    <span style={{ fontSize: "11px", padding: "4px 8px", background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Receiver: <strong>{riskData.risk_factors.receiver_risk} pts</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* EXPLAINABLE REASONS */}
              <div style={{ marginTop: "18px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <h4 style={{ margin: 0, fontSize: "14px", fontWeight: "700", color: "#0F172A" }}>
                    Explainable Risk Grounding:
                  </h4>
                  <span style={{ fontSize: "11px", color: "#64748B" }}>Ledger Verified</span>
                </div>

                {riskData.structured_reasons && riskData.structured_reasons.filter((r) => r.triggered === true).length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {riskData.structured_reasons
                      .filter((rule) => rule.triggered === true)
                      .map((rule) => {
                        const isExpanded = !!expandedReasons[rule.rule_code];
                        return (
                          <div
                            key={rule.rule_code}
                            style={{
                              border: "1px solid #E2E8F0",
                              borderRadius: "10px",
                              background: "#F8FAFC",
                              padding: "10px 12px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                              <div>
                                <span style={{ fontSize: "11px", fontWeight: "800", color: "#2563EB", marginRight: "6px" }}>
                                  {rule.rule_code}
                                </span>
                                <span style={{ fontSize: "12px", color: "#334155", fontWeight: "500" }}>
                                  {rule.reason_text}
                                </span>
                              </div>
                              {rule.evidence && (
                                <button
                                  type="button"
                                  onClick={() => toggleReasonExpand(rule.rule_code)}
                                  style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#2563EB",
                                    fontSize: "11px",
                                    fontWeight: "700",
                                    cursor: "pointer",
                                    flexShrink: 0,
                                  }}
                                >
                                  {isExpanded ? "Hide Evidence" : "Evidence"}
                                </button>
                              )}
                            </div>
                            {isExpanded && rule.evidence && <GroundedEvidenceView rule={rule} />}
                          </div>
                        );
                      })}
                  </div>
                ) : (
                  <div style={{ fontSize: "12.5px", color: "#475569" }}>
                    {riskData.reasons?.join("; ") || "Standard transaction within normal verified parameters."}
                  </div>
                )}
              </div>

              {/* TRANSACTION ID DISPLAY WITH COPY BUTTON */}
              {riskData.transaction_id && (
                <div
                  style={{
                    marginTop: "16px",
                    padding: "10px 14px",
                    background: "#F0F9FF",
                    border: "1px solid #BAE6FD",
                    borderRadius: "10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "10px",
                  }}
                >
                  <div style={{ fontSize: "12px", color: "#0C4A6E", fontWeight: 600 }}>
                    <span style={{ color: "#64748B", fontWeight: 500 }}>Txn ID: </span>
                    <span style={{ fontFamily: "monospace", fontSize: "11.5px", wordBreak: "break-all" }}>
                      {riskData.transaction_id}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(riskData.transaction_id).then(() => {
                        const btn = document.getElementById("copy-txn-id-btn");
                        if (btn) {
                          btn.textContent = "Copied ✓";
                          setTimeout(() => {
                            btn.textContent = "Copy";
                          }, 1500);
                        }
                      });
                    }}
                    id="copy-txn-id-btn"
                    style={{
                      background: "#0284C7",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "6px",
                      padding: "4px 10px",
                      fontSize: "11px",
                      fontWeight: 700,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Copy
                  </button>
                </div>
              )}

              {/* ACTION BUTTONS: TRACE & GRAPH */}
              <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                <button
                  type="button"
                  onClick={() => fetchTraceData(riskData.transaction_id)}
                  disabled={loadingTrace}
                  style={{
                    flex: 1,
                    padding: "10px 14px",
                    background: "#F1F5F9",
                    color: "#334155",
                    border: "1px solid #CBD5E1",
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  {loadingTrace ? "Loading..." : "🔍 Trace Details"}
                </button>

                {riskData.transaction_id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onViewInGraph) {
                        onViewInGraph(riskData.transaction_id);
                      } else {
                        navigate(`/?tab=graph&txn=${encodeURIComponent(riskData.transaction_id)}`);
                      }
                    }}
                    style={{
                      flex: 1.2,
                      padding: "10px 14px",
                      background: "linear-gradient(135deg, #0284C7, #0369A1)",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                    }}
                  >
                    <FaProjectDiagram /> View in Graph
                  </button>
                )}
              </div>

              {/* STEP-UP AUTH / COMPLETION BANNER */}
              <div
                style={{
                  marginTop: "18px",
                  background: actionColor || "#16A34A",
                  color: "#FFFFFF",
                  borderRadius: "14px",
                  padding: "18px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "15px", fontWeight: "700" }}>{actionTitle}</div>
                <button
                  type="button"
                  onClick={handleActionClick}
                  disabled={processingPayment || authType === "BLOCK"}
                  style={{
                    marginTop: "12px",
                    border: "none",
                    background: "#FFFFFF",
                    color: actionColor || "#16A34A",
                    padding: "12px 26px",
                    borderRadius: "10px",
                    cursor: authType === "BLOCK" ? "not-allowed" : "pointer",
                    fontWeight: "700",
                    fontSize: "14px",
                    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  }}
                >
                  {buttonText}
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* =========================================================================
          5. ACCOUNT SELECTOR MODALS (FOR SENDER & RECEIVER)
          ========================================================================= */}
      {(showSenderPicker || showReceiverPicker) && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => {
            setShowSenderPicker(false);
            setShowReceiverPicker(false);
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "20px",
              padding: "22px",
              maxWidth: "480px",
              width: "100%",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* MODAL HEADER */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#0F172A" }}>
                Select {showSenderPicker ? "Sender Account" : "Receiver Account"}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowSenderPicker(false);
                  setShowReceiverPicker(false);
                }}
                style={{
                  background: "#F1F5F9",
                  border: "none",
                  borderRadius: "50%",
                  width: "28px",
                  height: "28px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748B",
                }}
              >
                <FaTimes size={12} />
              </button>
            </div>

            {/* SEARCH & FILTER ROW */}
            <div style={{ display: "flex", gap: "8px" }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "8px 12px",
                }}
              >
                <FaSearch color="#94A3B8" size={12} />
                <input
                  type="text"
                  placeholder="Search ID, name, or UPI..."
                  value={showSenderPicker ? senderSearch : receiverSearch}
                  onChange={(e) => {
                    if (showSenderPicker) setSenderSearch(e.target.value);
                    else setReceiverSearch(e.target.value);
                  }}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: "13px",
                    width: "100%",
                  }}
                />
              </div>

              <select
                value={showSenderPicker ? senderFilter : receiverFilter}
                onChange={(e) => {
                  if (showSenderPicker) setSenderFilter(e.target.value);
                  else setReceiverFilter(e.target.value);
                }}
                style={{
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  borderRadius: "10px",
                  padding: "8px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#334155",
                  outline: "none",
                }}
              >
                <option value="ALL">All Types</option>
                <option value="STUDENT">Student</option>
                <option value="PROFESSIONAL">Professional</option>
                <option value="BUSINESS">Business</option>
                <option value="PERSONAL">Personal</option>
              </select>
            </div>

            {/* ACCOUNT RESULTS LIST */}
            <div
              style={{
                overflowY: "auto",
                maxHeight: "360px",
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {(showSenderPicker ? senderResults : receiverResults).length === 0 ? (
                <div style={{ padding: "20px", textAlign: "center", color: "#94A3B8", fontSize: "13px" }}>
                  No accounts found
                </div>
              ) : (
                (showSenderPicker ? senderResults : receiverResults).map((acc) => {
                  const isCurrent = showSenderPicker
                    ? selectedSender?.account_id === acc.account_id
                    : selectedReceiver?.account_id === acc.account_id;

                  return (
                    <div
                      key={acc.account_id}
                      onClick={() => {
                        if (showSenderPicker) selectSender(acc);
                        else selectReceiver(acc);
                      }}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "10px",
                        border: isCurrent ? "1.5px solid #3B82F6" : "1px solid #F1F5F9",
                        background: isCurrent ? "#EFF6FF" : "#FFFFFF",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        transition: "background 0.15s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrent) e.currentTarget.style.background = "#F8FAFC";
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrent) e.currentTarget.style.background = "#FFFFFF";
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "34px",
                            height: "34px",
                            borderRadius: "50%",
                            background: showSenderPicker ? "#3B82F6" : "#8B5CF6",
                            color: "#FFFFFF",
                            fontSize: "12px",
                            fontWeight: "700",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {getInitials(acc.account_name, acc.account_id)}
                        </div>
                        <div>
                          <div style={{ fontSize: "13.5px", fontWeight: "700", color: "#0F172A" }}>
                            {acc.account_id}
                          </div>
                          <div style={{ fontSize: "11.5px", color: "#64748B" }}>
                            {acc.account_name}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            fontSize: "10.5px",
                            padding: "2px 6px",
                            borderRadius: "6px",
                            background: "#F1F5F9",
                            color: "#475569",
                            fontWeight: "600",
                          }}
                        >
                          {acc.relationship_type || "Standard"}
                        </span>
                        {isCurrent && <FaCheck color="#3B82F6" size={12} />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. DEVICE SECURITY MODAL & TRACE MODAL
          ========================================================================= */}
      <DeviceSecurityModal
        isOpen={showDeviceModal}
        onClose={() => setShowDeviceModal(false)}
        authType={authType}
        deviceTrust={deviceTrust}
        senderAccount={selectedSender}
        receiverAccount={selectedReceiver}
        amount={amount}
        onFinalizePayment={completeTransaction}
        isProcessingPayment={processingPayment}
      />

      {showTraceModal && traceData && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "16px",
              padding: "25px",
              maxWidth: "550px",
              width: "100%",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ marginTop: 0 }}>Transaction Trace Log</h3>
            <p><strong>Transaction ID:</strong> {traceData.transaction_id}</p>
            <p><strong>Risk Score:</strong> {traceData.risk_score}% ({traceData.risk_level})</p>
            <p><strong>Prediction:</strong> {traceData.prediction}</p>
            
            <h4 style={{ marginTop: "15px", marginBottom: "5px" }}>Raw Feature Payload:</h4>
            <pre style={{ background: "#F1F5F9", padding: "12px", borderRadius: "8px", fontSize: "12px", overflowX: "auto" }}>
              {JSON.stringify(traceData.features, null, 2)}
            </pre>

            <button
              onClick={() => setShowTraceModal(false)}
              style={{
                marginTop: "15px",
                width: "100%",
                padding: "10px",
                background: "#2563EB",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              Close Trace Log
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default PaymentForm;
