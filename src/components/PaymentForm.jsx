import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import { collectDeviceSignals } from "../utils/deviceTrust";
import DeviceSecurityModal from "./DeviceSecurityModal";

function PaymentForm({ selectedScenario, onResetScenario }) {
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

  // Transaction time – default to current time
  const [transactionTime, setTransactionTime] = useState(() => {
    const now = new Date();
    return now.toISOString().slice(0, 16);
  });

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [checkingRisk, setCheckingRisk] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [showSenderList, setShowSenderList] = useState(false);
  const [showReceiverList, setShowReceiverList] = useState(false);

  const [error, setError] = useState("");
  const [riskData, setRiskData] = useState(null);
  const [authType, setAuthType] = useState("");
  const [actionTitle, setActionTitle] = useState("");
  const [actionColor, setActionColor] = useState("");
  const [buttonText, setButtonText] = useState("");

  // Trace modal states
  const [showTraceModal, setShowTraceModal] = useState(false);
  const [traceData, setTraceData] = useState(null);
  const [loadingTrace, setLoadingTrace] = useState(false);

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

  // Check if selected time is night
  const selectedDate = transactionTime ? new Date(transactionTime) : new Date();
  const hour = selectedDate.getHours();
  const isNight = hour >= 23 || hour < 5;

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
    }
    if (receiverAcc) {
      setSelectedReceiver(receiverAcc);
      setReceiverSearch(receiverAcc.account_id);
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
    } else {
      const now = new Date();
      setTransactionTime(now.toISOString().slice(0, 16));
    }
    setError("");
    setRiskData(null);
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
        setIsNewReceiver(Boolean(data.is_new_receiver));
        if (data.is_new_receiver) {
          setTransactionsLast10Min(0);
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
  }, [selectedSender?.account_id, selectedReceiver?.account_id]);

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
    return filteredSenderAccounts.filter((item) =>
      item.account_id.toLowerCase().includes(q) ||
      (item.account_name && item.account_name.toLowerCase().includes(q)) ||
      (item.upi_id && item.upi_id.toLowerCase().includes(q)) ||
      (item.mobile_number && item.mobile_number.includes(q))
    );
  }, [senderSearch, filteredSenderAccounts]);

  const receiverResults = useMemo(() => {
    if (!receiverSearch.trim()) return filteredReceiverAccounts;
    const q = receiverSearch.toLowerCase();
    return filteredReceiverAccounts.filter((item) =>
      item.account_id.toLowerCase().includes(q) ||
      (item.account_name && item.account_name.toLowerCase().includes(q)) ||
      (item.upi_id && item.upi_id.toLowerCase().includes(q)) ||
      (item.mobile_number && item.mobile_number.includes(q))
    );
  }, [receiverSearch, filteredReceiverAccounts]);

  /* ----------------------------- SELECT SENDER / RECEIVER ----------------------------- */

  function selectSender(account) {
    setSelectedSender(account);
    setSenderSearch(account.account_id);
    setShowSenderList(false);
  }

  function selectReceiver(account) {
    setSelectedReceiver(account);
    setReceiverSearch(account.account_id);
    setShowReceiverList(false);
  }

  /* ----------------------------- VALIDATION ----------------------------- */

  function validateForm() {
    if (!selectedSender) {
      setError("Please select Sender ID");
      return false;
    }
    if (!selectedReceiver) {
      setError("Please select Receiver ID");
      return false;
    }
    if (selectedSender.account_id === selectedReceiver.account_id) {
      setError("Sender and Receiver cannot be same.");
      return false;
    }
    if (!amount) {
      setError("Enter Amount");
      return false;
    }
    if (Number(amount) <= 0) {
      setError("Invalid Amount");
      return false;
    }
    if (!transactionTime) {
      setError("Please select a transaction time.");
      return false;
    }
    setError("");
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
        is_new_device: currentDeviceTrust?.is_known_device ? false : true,
        is_new_receiver: isNewReceiver,
        transactions_last_10min: isNewReceiver ? undefined : Number(transactionsLast10Min),
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
    } catch (error) {
      setCheckingRisk(false);
      if (error.response?.data?.error === "INSUFFICIENT_BALANCE") {
        setError("");
        setRiskData({
          insufficientBalance: true,
          available_balance: error.response.data.available_balance,
          requested_amount: error.response.data.requested_amount,
        });
        return;
      }
      setError(error.response?.data?.message || "Unable to calculate risk.");
    }
  }

  /* ----------------------------- AUTH DECISION ----------------------------- */

  function decideAuthentication(score, authRequirement, recommendation) {
    if (authRequirement === "BLOCKED" || recommendation === "BLOCK" || score > 80) {
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
    // Open Device Security Verification Modal
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
        is_new_device: deviceTrust?.is_known_device ? false : true,
        is_new_receiver: isNewReceiver,
        transactions_last_10min: isNewReceiver ? undefined : Number(transactionsLast10Min),
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

      // Save to localStorage for fallback persistence and state recovery
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

  /* ----------------------------- STYLES ----------------------------- */

  const labelStyle = {
    fontWeight: "600",
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    color: "#111827",
  };

  const inputStyle = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid #D1D5DB",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    background: "#FFFFFF",
    color: "#111827",
  };

  const dropdownStyle = {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    background: "#FFFFFF",
    color: "#111827",
    border: "1px solid #E5E7EB",
    borderRadius: "10px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.1)",
    maxHeight: "200px",
    overflowY: "auto",
    zIndex: 50,
  };

  const itemStyle = {
    padding: "10px 14px",
    cursor: "pointer",
    color: "#111827",
    borderBottom: "1px solid #F3F4F6",
  };

  const radioContainerStyle = {
    display: "flex",
    gap: "12px",
    marginTop: "6px",
  };

  const optionButtonStyle = (active) => ({
    flex: 1,
    padding: "10px",
    borderRadius: "8px",
    border: active ? "2px solid #2563EB" : "1px solid #D1D5DB",
    background: active ? "#EFF6FF" : "#F9FAFB",
    color: active ? "#1D4ED8" : "#374151",
    fontWeight: active ? "600" : "500",
    cursor: "pointer",
    fontSize: "13px",
    textAlign: "center",
  });

  return (
    <div
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "30px",
        boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <h2 style={{ margin: 0, color: "#111827" }}>
          Send Money / Risk Analysis
        </h2>
      </div>
      <p style={{ color: "#6B7280", marginBottom: "20px" }}>
        Enter payment parameters and contextual risk signals to evaluate fraud in real time.
      </p>

      {/* SENDER FIELD */}
      <div style={{ marginBottom: "20px", position: "relative" }}>
        <label style={labelStyle}>
          Sender ID
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={senderSearch}
            onFocus={() => setShowSenderList(true)}
            onChange={(e) => {
              setSenderSearch(e.target.value);
              setShowSenderList(true);
            }}
            placeholder="Search Sender ID (e.g. A0001)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <select
            value={senderFilter}
            onChange={(e) => setSenderFilter(e.target.value)}
            style={{ ...inputStyle, width: "130px", flexShrink: 0 }}
          >
            <option value="ALL">All Types</option>
            <option value="STUDENT">Student</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="BUSINESS">Business</option>
            <option value="PERSONAL">Personal</option>
          </select>
        </div>
        {showSenderList && (
          <div style={dropdownStyle}>
            {senderResults.length === 0 ? (
              <div style={{ padding: "12px", color: "#6B7280" }}>
                No accounts match
              </div>
            ) : (
              senderResults.map((item) => (
                <div
                  key={item.account_id}
                  style={itemStyle}
                  onClick={() => selectSender(item)}
                >
                  <strong>{item.account_id}</strong> - {item.account_name} ({item.relationship_type || "N/A"})
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* RECEIVER FIELD */}
      <div style={{ marginBottom: "20px", position: "relative" }}>
        <label style={labelStyle}>
          Receiver ID
        </label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={receiverSearch}
            onFocus={() => setShowReceiverList(true)}
            onChange={(e) => {
              setReceiverSearch(e.target.value);
              setShowReceiverList(true);
            }}
            placeholder="Search Receiver ID (e.g. A0002)"
            style={{ ...inputStyle, flex: 1 }}
          />
          <select
            value={receiverFilter}
            onChange={(e) => setReceiverFilter(e.target.value)}
            style={{ ...inputStyle, width: "130px", flexShrink: 0 }}
          >
            <option value="ALL">All Types</option>
            <option value="STUDENT">Student</option>
            <option value="PROFESSIONAL">Professional</option>
            <option value="BUSINESS">Business</option>
            <option value="PERSONAL">Personal</option>
          </select>
        </div>
        {showReceiverList && (
          <div style={dropdownStyle}>
            {receiverResults.length === 0 ? (
              <div style={{ padding: "12px", color: "#6B7280" }}>
                No accounts match
              </div>
            ) : (
              receiverResults.map((item) => (
                <div
                  key={item.account_id}
                  style={itemStyle}
                  onClick={() => selectReceiver(item)}
                >
                  <strong>{item.account_id}</strong> - {item.account_name} ({item.relationship_type || "N/A"})
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* AMOUNT */}
      <div style={{ marginBottom: "20px" }}>
        <label style={labelStyle}>
          Amount (₹)
        </label>
        <input
          type="number"
          value={amount}
          placeholder="Enter Amount"
          onChange={(e) => setAmount(e.target.value)}
          style={inputStyle}
        />
      </div>

      {/* RECEIVER STATUS CONTROLS - AUTOMATICALLY DETERMINED FROM HISTORICAL LEDGER */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>
            Receiver Status
          </label>
          {loadingRelationship ? (
            <span style={{ fontSize: "11px", color: "#2563EB", fontWeight: "600", display: "inline-flex", alignItems: "center", gap: "5px" }}>
              <span>🔄</span> Checking Ledger...
            </span>
          ) : relationshipInfo ? (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                color: isNewReceiver ? "#D97706" : "#16A34A",
                background: isNewReceiver ? "#FEF3C7" : "#DCFCE7",
                border: `1px solid ${isNewReceiver ? "#FCD34D" : "#86EFAC"}`,
                padding: "2px 8px",
                borderRadius: "6px",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
              }}
              title="Receiver status is automatically derived from the historical transaction database and payment ledger."
            >
              ⚡ Auto-detected from ledger
            </span>
          ) : (
            <span style={{ fontSize: "11px", color: "#94A3B8" }}>
              Select sender &amp; receiver to evaluate
            </span>
          )}
        </div>

        <div style={radioContainerStyle}>
          <div
            style={{
              ...optionButtonStyle(!isNewReceiver),
              cursor: "default",
              userSelect: "none",
              opacity: loadingRelationship ? 0.7 : 1,
              boxShadow: !isNewReceiver ? "0 2px 8px rgba(37,99,235,0.12)" : "none",
            }}
          >
            👤 Existing Receiver
            {!isNewReceiver && relationshipInfo && (
              <span style={{ display: "block", fontSize: "11px", marginTop: "3px", color: "#16A34A", fontWeight: "600" }}>
                ✓ {relationshipInfo.transaction_count > 0 ? `${relationshipInfo.transaction_count} completed transfers in ledger` : "Known contact"}
              </span>
            )}
          </div>
          <div
            style={{
              ...optionButtonStyle(isNewReceiver),
              cursor: "default",
              userSelect: "none",
              opacity: loadingRelationship ? 0.7 : 1,
              boxShadow: isNewReceiver ? "0 2px 8px rgba(217,119,6,0.12)" : "none",
            }}
          >
            🆕 First-Time Receiver
            {isNewReceiver && relationshipInfo && (
              <span style={{ display: "block", fontSize: "11px", marginTop: "3px", color: "#D97706", fontWeight: "600" }}>
                ⚠️ No prior transaction history
              </span>
            )}
          </div>
        </div>

        {relationshipInfo && (
          <div
            style={{
              marginTop: "8px",
              padding: "10px 14px",
              borderRadius: "10px",
              background: isNewReceiver ? "#FFFBEB" : "#F0FDF4",
              border: `1px solid ${isNewReceiver ? "#FDE68A" : "#BBF7D0"}`,
              fontSize: "12px",
              color: isNewReceiver ? "#92400E" : "#166534",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            <span>
              {isNewReceiver
                ? `No prior ledger records found between sender ${selectedSender?.account_id} and recipient ${selectedReceiver?.account_id}. Flagged as first-time payee.`
                : `Found ${relationshipInfo.transaction_count} prior completed payments (Total: ₹${(relationshipInfo.total_amount || 0).toLocaleString("en-IN")}, Avg: ₹${(relationshipInfo.average_amount || 0).toLocaleString("en-IN")}).`}
            </span>
            <span
              style={{
                fontWeight: "700",
                fontSize: "11px",
                background: isNewReceiver ? "#FEF3C7" : "#DCFCE7",
                padding: "3px 8px",
                borderRadius: "6px",
              }}
            >
              {isNewReceiver ? "RELATION: NEW_PAYEE" : `RELATION: ${relationshipInfo.relationship_type || "VERIFIED"}`}
            </span>
          </div>
        )}
      </div>

      {/* TRANSACTIONS IN LAST 10 MINUTES (Only shown/enabled for Existing Receiver) */}
      {!isNewReceiver && (
        <div style={{ marginBottom: "20px" }}>
          <label style={labelStyle}>
            Transactions in Last 10 Minutes
          </label>
          <input
            type="number"
            min="0"
            value={transactionsLast10Min}
            onChange={(e) => setTransactionsLast10Min(e.target.value)}
            placeholder="0"
            style={inputStyle}
          />
          <span style={{ fontSize: "12px", color: "#64748B", marginTop: "4px", display: "block" }}>
            Short-term transfer velocity indicator (Micro-Phishing trigger if &ge; 3-4 transfers).
          </span>
        </div>
      )}

      {/* TRANSACTION TIME PICKER */}
      <div style={{ marginBottom: "25px" }}>
        <label style={labelStyle}>
          Transaction Time
        </label>
        <input
          type="datetime-local"
          value={transactionTime}
          onChange={(e) => setTransactionTime(e.target.value)}
          style={inputStyle}
        />
      </div>

      {error && (
        <div
          style={{
            background: "#FEE2E2",
            color: "#B91C1C",
            padding: "12px",
            borderRadius: "10px",
            marginBottom: "20px",
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={checkRisk}
        disabled={checkingRisk}
        style={{
          width: "100%",
          border: "none",
          background: "#2563EB",
          color: "#fff",
          padding: "16px",
          borderRadius: "12px",
          cursor: "pointer",
          fontSize: "16px",
          fontWeight: "600",
          boxShadow: "0 4px 12px rgba(37,99,235,0.25)"
        }}
      >
        {checkingRisk ? "Calculating Synchronized Risk..." : "Check Transaction Risk"}
      </button>

      {/* RISK ANALYSIS RESULTS */}
      {riskData &&
        (riskData.insufficientBalance ? (
          <div
            style={{
              marginTop: "30px",
              border: "1px solid #FCA5A5",
              borderRadius: "15px",
              padding: "25px",
              background: "#FEF2F2",
              color: "#991B1B",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#991B1B" }}>
              Insufficient Balance
            </h2>
            <p style={{ color: "#991B1B" }}>
              <strong>Available Balance :</strong> ₹{riskData.available_balance}
            </p>
            <p style={{ color: "#991B1B" }}>
              <strong>Requested Amount :</strong> ₹{riskData.requested_amount}
            </p>
          </div>
        ) : (
          <>
            <div
              style={{
                marginTop: "30px",
                border: "1px solid #E5E7EB",
                borderRadius: "15px",
                padding: "25px",
                background: "#FFFFFF",
                color: "#111827",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ marginTop: 0, color: "#111827", fontSize: "20px" }}>
                  AI Fraud Analysis
                </h2>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: "20px",
                    fontWeight: "700",
                    fontSize: "13px",
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginTop: "15px" }}>
                <p style={{ margin: 0 }}>
                  <strong>Receiver:</strong> {riskData.receiver_name}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Risk Score:</strong> {riskData.risk_score}%
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Prediction:</strong> {riskData.prediction}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Fraud Probability:</strong> {(riskData.fraud_probability * 100).toFixed(1)}%
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Authentication:</strong> {riskData.authentication}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Recommendation:</strong> {riskData.recommendation}
                </p>
              </div>

              {/* RISK FACTORS BREAKDOWN */}
              {riskData.risk_factors && (
                <div style={{ marginTop: "20px", background: "#F8FAFC", padding: "15px", borderRadius: "10px", border: "1px solid #E2E8F0" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: "#334155", marginBottom: "10px" }}>
                    📊 Risk Factor Contribution Breakdown:
                  </div>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "12px", padding: "4px 10px", background: "#fff", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Amount Risk: <strong>{riskData.risk_factors.amount_risk} pts</strong>
                    </span>
                    <span style={{ fontSize: "12px", padding: "4px 10px", background: "#fff", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Velocity Risk: <strong>{riskData.risk_factors.velocity_risk} pts</strong>
                    </span>
                    <span style={{ fontSize: "12px", padding: "4px 10px", background: "#fff", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Device Risk: <strong>{riskData.risk_factors.device_risk} pts</strong>
                    </span>
                    <span style={{ fontSize: "12px", padding: "4px 10px", background: "#fff", border: "1px solid #CBD5E1", borderRadius: "6px" }}>
                      Receiver Risk: <strong>{riskData.risk_factors.receiver_risk} pts</strong>
                    </span>
                  </div>
                </div>
              )}

              <hr
                style={{
                  margin: "20px 0",
                  border: "none",
                  borderTop: "1px solid #E5E7EB",
                }}
              />

              <h3 style={{ color: "#111827", marginBottom: "12px", fontSize: "16px" }}>
                Why AI marked this transaction:
              </h3>
              <ul style={{ color: "#374151", paddingLeft: "20px", margin: 0 }}>
                {riskData.reasons &&
                  riskData.reasons.map((reason, index) => (
                    <li
                      key={index}
                      style={{
                        marginBottom: "8px",
                        lineHeight: "22px",
                        fontSize: "14px"
                      }}
                    >
                      {reason}
                    </li>
                  ))}
              </ul>
            </div>

            {/* TRACE TRANSACTION BUTTON */}
            <button
              onClick={() => fetchTraceData(riskData.transaction_id)}
              disabled={loadingTrace}
              style={{
                marginTop: "15px",
                width: "100%",
                padding: "12px",
                background: "#6B7280",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: "600",
              }}
            >
              {loadingTrace ? "Loading..." : "🔍 Trace Transaction Details"}
            </button>

            <div
              style={{
                marginTop: "25px",
                background: actionColor,
                color: "#FFFFFF",
                borderRadius: "15px",
                padding: "25px",
                textAlign: "center",
              }}
            >
              <h2>{actionTitle}</h2>
              <button
                onClick={handleActionClick}
                disabled={processingPayment || authType === "BLOCK"}
                style={{
                  marginTop: "15px",
                  border: "none",
                  background: "#FFFFFF",
                  color: actionColor,
                  padding: "14px 30px",
                  borderRadius: "10px",
                  cursor: authType === "BLOCK" ? "not-allowed" : "pointer",
                  fontWeight: "700",
                  fontSize: "16px",
                }}
              >
                {buttonText}
              </button>
            </div>
          </>
        ))}

      {/* DEVICE SECURITY & INTEGRITY CHECK MODAL (Runs before completing payment) */}
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

      {/* TRACE MODAL */}
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
            
            <h4 style={{ marginTop: "15px", marginBottom: "5px" }}>Raw Feature Payload Passed to Model:</h4>
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
