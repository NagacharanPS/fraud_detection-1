import React, { useState } from "react";
import PaymentForm from "../components/PaymentForm";
import DemoRiskScenarios from "../components/DemoRiskScenarios";

function Home() {
  const [selectedScenario, setSelectedScenario] = useState(null);

  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
    const formEl = document.getElementById("payment-initiation-form");
    if (formEl) {
      formEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      style={{
        maxWidth: "1280px",
        margin: "0 auto",
        padding: "24px 20px 60px",
        display: "flex",
        flexDirection: "column",
        gap: "36px",
      }}
    >
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
    </div>
  );
}

export default Home;
