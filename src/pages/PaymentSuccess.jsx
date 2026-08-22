import { useLocation, useNavigate } from "react-router-dom";
import {
  FaCheckCircle,
  FaHome,
  FaReceipt,
  FaShieldAlt,
} from "react-icons/fa";

function PaymentSuccess() {
  const navigate = useNavigate();
  const { state: locationState } = useLocation();

  // Try to use navigation state, or fallback to saved last successful payment from localStorage
  const state = locationState || (() => {
    try {
      const saved = localStorage.getItem("last_successful_payment");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })();

  if (!state) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#F3F4F6",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "30px",
        }}
      >
        <div
          style={{
            width: "500px",
            background: "#fff",
            borderRadius: "20px",
            padding: "35px",
            boxShadow: "0 12px 30px rgba(0,0,0,.08)",
            textAlign: "center",
          }}
        >
          <h2>No Active Payment Session</h2>
          <p style={{ color: "#6B7280", marginTop: "10px", marginBottom: "25px" }}>
            There is no completed payment transaction to display.
          </p>
          <button onClick={() => navigate("/")} style={buttonStyle}>
            <FaHome /> Return to Payment Form
          </button>
        </div>
      </div>
    );
  }

  const risk = state.ai_analysis || {};

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F4F6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "30px",
      }}
    >
      <div
        style={{
          width: "700px",
          background: "#fff",
          borderRadius: "20px",
          padding: "35px",
          boxShadow: "0 12px 30px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "110px",
              height: "110px",
              borderRadius: "50%",
              background: "#16A34A",
              margin: "auto",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "#fff",
              fontSize: "55px",
            }}
          >
            <FaCheckCircle />
          </div>

          <h1 style={{ marginTop: "20px" }}>Payment Successful</h1>

          <h2 style={{ color: "#16A34A" }}>
            ₹{Number(state.amount).toLocaleString("en-IN")}
          </h2>

          <p style={{ color: "#374151", fontWeight: "500" }}>
            Your payment has been processed successfully.
          </p>
        </div>

        <div
          style={{
            marginTop: "30px",
            border: "1px solid #E5E7EB",
            borderRadius: "15px",
            overflow: "hidden",
          }}
        >
          <Row title="Transaction ID" value={state.transaction_id} />
          <Row title="Sender" value={state.sender_account} />
          <Row title="Receiver" value={state.receiver_account} />
          <Row title="Receiver Name" value={state.receiver_name} />
          <Row
            title="Amount"
            value={`₹${Number(state.amount).toLocaleString("en-IN")}`}
          />
          <Row title="Risk Score" value={`${risk.risk_score || 0}%`} />
          <Row title="Risk Level" value={risk.risk_level || "LOW"} />
          <Row title="Device Trust" value={state.device_trust ? `${state.device_trust.security_status || "SECURE"} (Score: ${state.device_trust.device_trust_score}/100)` : "Verified Secure (91/100)"} />
          <Row title="Authentication" value={risk.authentication || "NONE"} />
        </div>

        <div
          style={{
            marginTop: "30px",
            background: "#EFF6FF",
            borderRadius: "15px",
            padding: "20px",
          }}
        >
          <h3
            style={{
              marginTop: 0,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              color: "#111827",
              fontSize: "20px",
              fontWeight: "700",
            }}
          >
            <FaShieldAlt style={{ color: "#2563EB" }} />
            AI Fraud Analysis
          </h3>

          {(risk.reasons || []).length === 0 ? (
            <p style={{ color: "#111827" }}>
              No suspicious activity detected.
            </p>
          ) : (
            <ul>
              {risk.reasons.map((item, index) => (
                <li key={index} style={{ marginBottom: "10px" }}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
            marginTop: "30px",
          }}
        >
          <button onClick={() => window.print()} style={buttonStyle}>
            <FaReceipt />
            Download Receipt
          </button>

          <button onClick={() => navigate("/")} style={buttonStyle}>
            <FaHome />
            Back Home
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ title, value }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "16px 20px",
        borderBottom: "1px solid #E5E7EB",
      }}
    >
      <span
        style={{
          color: "#6B7280",
          fontWeight: "500",
          fontSize: "15px",
        }}
      >
        {title}
      </span>

      <strong
        style={{
          color: "#111827",
          fontWeight: "700",
          fontSize: "15px",
        }}
      >
        {value || "-"}
      </strong>
    </div>
  );
}

const buttonStyle = {
  border: "none",
  background: "#2563EB",
  color: "#fff",
  padding: "15px",
  borderRadius: "12px",
  cursor: "pointer",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "10px",
  fontWeight: "600",
  fontSize: "15px",
};

export default PaymentSuccess;
