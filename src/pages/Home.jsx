import React, { useState } from "react";
import PaymentForm from "../components/PaymentForm";
import DemoRiskScenarios from "../components/DemoRiskScenarios";

function Home() {
  const [selectedScenario, setSelectedScenario] = useState(null);

  const handleSelectScenario = (scenario) => {
    setSelectedScenario(scenario);
  };

  return (
    <div
      style={{
        maxWidth: "1440px",
        margin: "0 auto",
        padding: "24px 20px 48px",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(460px, 1fr))",
          gap: "28px",
          alignItems: "start",
        }}
      >
        {/* LEFT COLUMN: PAYMENT INITIATION & RISK VERIFICATION */}
        <div style={{ width: "100%" }}>
          <PaymentForm
            selectedScenario={selectedScenario}
            onResetScenario={() => setSelectedScenario(null)}
          />
        </div>

        {/* RIGHT COLUMN: INTERACTIVE RISK DEMO SCENARIOS */}
        <div style={{ width: "100%" }}>
          <DemoRiskScenarios
            onSelectScenario={handleSelectScenario}
            selectedScenarioId={selectedScenario?.id}
          />
        </div>
      </div>
    </div>
  );
}

export default Home;
