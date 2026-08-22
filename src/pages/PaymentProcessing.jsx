import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaRobot,
  FaShieldAlt,
  FaSearch,
  FaProjectDiagram,
  FaBrain,
  FaCheckCircle,
} from "react-icons/fa";

function PaymentProcessing() {
  const navigate = useNavigate();
  const { state } = useLocation();

  const steps = [
    {
      icon: <FaSearch />,
      title: "Verifying Receiver",
    },
    {
      icon: <FaShieldAlt />,
      title: "Checking Previous Transactions",
    },
    {
      icon: <FaProjectDiagram />,
      title: "Graph Pattern Analysis",
    },
    {
      icon: <FaBrain />,
      title: "Behaviour Analysis",
    },
    {
      icon: <FaRobot />,
      title: "AI Risk Prediction",
    },
  ];

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/payment-success", { state, replace: true });
    }, 2500);

    return () => clearTimeout(timer);
  }, [navigate, state]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F3F4F6",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          width: "650px",
          background: "#fff",
          borderRadius: "20px",
          padding: "35px",
          boxShadow: "0 12px 30px rgba(0,0,0,.08)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "90px",
              height: "90px",
              borderRadius: "50%",
              margin: "auto",
              background: "#2563EB",
              color: "#fff",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "40px",
            }}
          >
            <FaRobot />
          </div>

          <h1 style={{ marginTop: "20px", marginBottom: "5px" }}>
            AI Fraud Detection
          </h1>

          <p style={{ color: "#374151", fontSize: "16px" }}>
            Please wait while we analyze this transaction.
          </p>
        </div>

        <div style={{ marginTop: "35px" }}>
          {steps.map((step, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px",
                marginBottom: "15px",
                borderRadius: "12px",
                background: "#F9FAFB",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                <div
                  style={{
                    width: "45px",
                    height: "45px",
                    borderRadius: "50%",
                    background: "#DBEAFE",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#2563EB",
                  }}
                >
                  {step.icon}
                </div>

                <strong
                  style={{
                    color: "#111827",
                    fontSize: "16px",
                    fontWeight: "600",
                  }}
                >
                  {step.title}
                </strong>
              </div>

              <FaCheckCircle color="#16A34A" size={22} />
            </div>
          ))}
        </div>

        <div style={{ marginTop: "30px" }}>
          <div
            style={{
              height: "10px",
              background: "#E5E7EB",
              borderRadius: "20px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "#2563EB",
                animation: "progress 4.5s linear forwards",
              }}
            />
          </div>

          <p
            style={{
              textAlign: "center",
              marginTop: "12px",
              color: "#111827",
              fontWeight: "500",
            }}
          >
            AI Engine Processing...
          </p>
        </div>

        <style>{`
          @keyframes progress{
            from{
              width:0%;
            }
            to{
              width:100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

export default PaymentProcessing;
