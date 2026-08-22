function AuthenticationCard({
  risk,
  onProceed,
  loading = false,
}) {
  if (!risk) return null;

  let title = "";
  let description = "";
  let buttonText = "";
  let color = "";

  switch (risk.authentication) {
    case "NONE":
      title = "Safe Transaction";
      description =
        "No additional verification is required.";
      buttonText = "Complete Payment";
      color = "#16A34A";
      break;

    case "OTP":
      title = "OTP Verification Required";
      description =
        "Risk score indicates additional OTP verification is required before payment.";
      buttonText = "Send OTP";
      color = "#F59E0B";
      break;

    case "FACE":
      title = "Face Verification Required";
      description =
        "High-risk transaction detected. Verify your identity using Face Authentication.";
      buttonText = "Verify Face";
      color = "#2563EB";
      break;

    case "FREEZE":
      title = "Transaction Frozen";
      description =
        "Critical fraud risk detected. Transaction has been temporarily frozen.";
      buttonText = "View Details";
      color = "#DC2626";
      break;

    default:
      title = "Unknown";
      description = "";
      buttonText = "Continue";
      color = "#6B7280";
  }

  return (
    <div
      style={{
        marginTop: "30px",
        borderRadius: "18px",
        background: color,
        color: "#fff",
        padding: "30px",
        textAlign: "center",
        boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
      }}
    >
      <h2
        style={{
          marginTop: 0,
        }}
      >
        {title}
      </h2>

      <p
        style={{
          opacity: 0.95,
          lineHeight: "26px",
          marginBottom: "25px",
        }}
      >
        {description}
      </p>

      <button
        disabled={
          loading ||
          risk.authentication === "FREEZE"
        }
        onClick={onProceed}
        style={{
          border: "none",
          background: "#fff",
          color,
          padding: "15px 35px",
          borderRadius: "12px",
          cursor:
            risk.authentication === "FREEZE"
              ? "not-allowed"
              : "pointer",
          fontWeight: "700",
          fontSize: "16px",
          transition: "0.3s",
        }}
      >
        {loading
          ? "Processing..."
          : buttonText}
      </button>
    </div>
  );
}

export default AuthenticationCard;
