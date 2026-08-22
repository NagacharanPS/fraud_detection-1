import { FaRobot, FaShieldAlt } from "react-icons/fa";

function LoadingScreen() {
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
          width: "600px",
          background: "#fff",
          borderRadius: "20px",
          padding: "40px",
          textAlign: "center",
          boxShadow: "0 12px 30px rgba(0,0,0,.08)",
        }}
      >
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "#2563EB",
            color: "#fff",
            margin: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: "45px",
            animation: "pulse 1.5s infinite",
          }}
        >
          <FaRobot />
        </div>

        <h1
          style={{
            marginTop: "25px",
            color: "#111827",
          }}
        >
          AI Fraud Detection
        </h1>

        <p
          style={{
            color: "#6B7280",
            marginBottom: "35px",
          }}
        >
          Please wait while AI verifies this transaction...
        </p>

        <div
          style={{
            display: "grid",
            gap: "18px",
          }}
        >
          <Step title="Receiver Verification" />
          <Step title="Transaction History Analysis" />
          <Step title="Behaviour Analysis" />
          <Step title="Graph Pattern Detection" />
          <Step title="Risk Score Prediction" />
        </div>

        <div
          style={{
            marginTop: "35px",
          }}
        >
          <div
            style={{
              height: "12px",
              background: "#E5E7EB",
              borderRadius: "30px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: "100%",
                background: "#2563EB",
                animation: "loading 4s linear forwards",
              }}
            />
          </div>
        </div>

        <style>{`
            @keyframes loading{
                from{
                    width:0%;
                }
                to{
                    width:100%;
                }
            }

            @keyframes pulse{
                0%{
                    transform:scale(1);
                }

                50%{
                    transform:scale(1.08);
                }

                100%{
                    transform:scale(1);
                }
            }
        `}</style>
      </div>
    </div>
  );
}

function Step({ title }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#F9FAFB",
        padding: "16px",
        borderRadius: "12px",
      }}
    >
      <span
        style={{
          fontWeight: "600",
          color: "#374151",
        }}
      >
        {title}
      </span>

      <FaShieldAlt
        color="#2563EB"
        size={20}
      />
    </div>
  );
}

export default LoadingScreen;
