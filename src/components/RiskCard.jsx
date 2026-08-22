function RiskCard({ risk }) {
  if (!risk) return null;

  return (
    <div
      style={{
        marginTop: 25,
        padding: 25,
        background: "#fff",
        borderRadius: 15,
        border: "2px solid #2563EB"
      }}
    >
      <h2>AI Fraud Analysis</h2>

      <p>
        <strong>Receiver :</strong>{" "}
        {risk.receiver_name}
      </p>

      <p>
        <strong>Risk Score :</strong>{" "}
        {risk.risk_score}%
      </p>

      <p>
        <strong>Fraud Probability :</strong>{" "}
        {(risk.fraud_probability * 100).toFixed(2)}%
      </p>

      <p>
        <strong>Risk Level :</strong>{" "}
        {risk.risk_level}
      </p>

      <p>
        <strong>Authentication :</strong>{" "}
        {risk.authentication}
      </p>

      <p>
        <strong>Recommendation :</strong>{" "}
        {risk.recommendation}
      </p>

      <h3
        style={{
          marginTop: "20px",
          color: "#111827"
        }}
      >
        Why did AI give this score?
      </h3>

      <ul
        style={{
          marginTop: "10px",
          paddingLeft: "20px",
          color: "#374151"
        }}
      >
        {risk.reasons?.map((reason, index) => (
          <li
            key={index}
            style={{
              marginBottom: "10px"
            }}
          >
            {reason}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default RiskCard;
