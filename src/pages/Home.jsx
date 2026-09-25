import React, { useState } from "react";
import PaymentForm from "../components/PaymentForm";
import DemoRiskScenarios from "../components/DemoRiskScenarios";
import DatasetExplorer from "../components/DatasetExplorer";
import { FaBolt, FaTable, FaShieldAlt } from "react-icons/fa";

function Home() {
  const [activeTab, setActiveTab] = useState("simulator"); // "simulator" | "explorer"
  const [selectedScenario, setSelectedScenario] = useState(null);

  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    setActiveTab("simulator");
    setTimeout(() => {
      const formEl = document.getElementById("payment-initiation-form");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleSelectPairForSimulation = (senderId, receiverId, amount) => {
    setSelectedScenario({
      id: `CUSTOM_${Date.now()}`,
      sender: senderId,
      receiver: receiverId,
      amount: amount || 5000,
    });
    setActiveTab("simulator");
    setTimeout(() => {
      const formEl = document.getElementById("payment-initiation-form");
      if (formEl) {
        formEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "16px 20px 60px",
        display: "flex",
        flexDirection: "column",
        gap: "28px",
      }}
    >
      {/* MAIN VIEW NAVIGATION TABS */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <div
          style={{
            background: "#E2E8F0",
            padding: "4px",
            borderRadius: "14px",
            display: "inline-flex",
            gap: "4px",
            boxShadow: "inset 0 2px 4px rgba(0,0,0,0.06)",
          }}
        >
          <button
            onClick={() => setActiveTab("simulator")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              border: "none",
              background: activeTab === "simulator" ? "#FFFFFF" : "transparent",
              color: activeTab === "simulator" ? "#2563EB" : "#64748B",
              boxShadow:
                activeTab === "simulator"
                  ? "0 4px 12px rgba(37, 99, 235, 0.15)"
                  : "none",
              transition: "all 0.2s ease",
            }}
          >
            <FaBolt /> Real-Time Payment Simulator
          </button>

          <button
            onClick={() => setActiveTab("explorer")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 24px",
              borderRadius: "10px",
              fontSize: "14px",
              fontWeight: "700",
              cursor: "pointer",
              border: "none",
              background: activeTab === "explorer" ? "#FFFFFF" : "transparent",
              color: activeTab === "explorer" ? "#2563EB" : "#64748B",
              boxShadow:
                activeTab === "explorer"
                  ? "0 4px 12px rgba(37, 99, 235, 0.15)"
                  : "none",
              transition: "all 0.2s ease",
            }}
          >
            <FaTable /> Dataset Explorer & Ledger Audit
          </button>
        </div>
      </div>

      {activeTab === "simulator" ? (
        <>
          {/* 1. TOP SECTION: LIVE DEMO RISK SCENARIOS */}
          <section style={{ width: "100%" }}>
            <DemoRiskScenarios
              onSelectScenario={handleSelectScenario}
              selectedScenarioId={selectedScenario?.id}
            />
          </section>

          {/* 2. BOTTOM SECTION: PAYMENT INITIATION & AUTHENTICATION CHALLENGE */}
          <section
            id="payment-initiation-form"
            style={{
              width: "100%",
              maxWidth: "760px",
              margin: "0 auto",
            }}
          >
            <PaymentForm
              selectedScenario={selectedScenario}
              onResetScenario={() => setSelectedScenario(null)}
            />
          </section>
        </>
      ) : (
        /* DATASET EXPLORER & AUDIT TAB */
        <section style={{ width: "100%" }}>
          <DatasetExplorer
            onSelectPairForSimulation={handleSelectPairForSimulation}
          />
        </section>
      )}
    </div>
  );
}

export default Home;
