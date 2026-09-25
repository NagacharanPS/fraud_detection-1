import React, { useState } from "react";

export const DEMO_SCENARIOS = [
  {
    category: "LOW",
    categoryLabel: "Low Risk",
    subLabel: "Direct Transfer",
    icon: "🟢",
    authBadge: "Direct Execution",
    themeColor: "#16A34A",
    bgColor: "#F0FDF4",
    borderColor: "#86EFAC",
    badgeBg: "#DCFCE7",
    tagline: "Standard Spending & Verified Trusted Payees",
    scenarios: [
      {
        id: "low-1",
        title: "Verified Utility Bill Payment",
        description: "Standard daytime utility payment to municipal water provider within regular monthly limits.",
        sender: "A0001",
        senderName: "Rahul Sharma (Professional)",
        receiver: "A0012",
        receiverName: "CityWater (Utility)",
        amount: 1450,
        purpose: "UTILITY_BILL",
        isNewReceiver: false,
        transactionsLast10Min: 0,
        time: null,
        tag: "Verified Utility • Daytime",
        expectedFlow: "🟢 Direct Payment (No Extra Challenge)",
      },
      {
        id: "low-2",
        title: "Regular Personal Contact Transfer",
        description: "Routine transfer to a verified contact with high trust score (95/100).",
        sender: "A0002",
        senderName: "Charan Nair (Professional)",
        receiver: "A0010",
        receiverName: "Priya Gupta (Professional)",
        amount: 2400,
        purpose: "PERSONAL",
        isNewReceiver: false,
        transactionsLast10Min: 0,
        time: null,
        tag: "High Trust Contact • Normal Range",
        expectedFlow: "🟢 Direct Payment (No Extra Challenge)",
      },
      {
        id: "low-3",
        title: "Daily Merchant & Dining Payment",
        description: "Small dining purchase well below user historical average limit.",
        sender: "A0006",
        senderName: "Meera Singh (Doctor)",
        receiver: "A0021",
        receiverName: "TechWorld52 (Merchant)",
        amount: 3500,
        purpose: "FOOD_DINING",
        isNewReceiver: false,
        transactionsLast10Min: 0,
        time: null,
        tag: "Merchant Payee • Normal Spending",
        expectedFlow: "🟢 Direct Payment (No Extra Challenge)",
      },
    ],
  },
  {
    category: "MEDIUM",
    categoryLabel: "Medium Risk",
    subLabel: "SMS OTP Step-Up",
    icon: "🟡",
    authBadge: "Requires SMS OTP",
    themeColor: "#D97706",
    bgColor: "#FFFBEB",
    borderColor: "#FCD34D",
    badgeBg: "#FEF3C7",
    tagline: "First-Time Payees & Above-Average Spending (Score 31-60%)",
    scenarios: [
      {
        id: "med-1",
        title: "First-Time Receiver Transfer (OTP)",
        description: "Payment to a new recipient without prior relationship in the transaction ledger.",
        sender: "A0001",
        senderName: "Rahul Sharma (Professional)",
        receiver: "A0010",
        receiverName: "Priya Gupta (Professional)",
        amount: 12500,
        purpose: "PERSONAL",
        isNewReceiver: true,
        transactionsLast10Min: 0,
        time: null,
        tag: "New Counterparty • Moderate Increase",
        expectedFlow: "🟡 Step-Up Challenge: SMS / WhatsApp OTP",
      },
      {
        id: "med-2",
        title: "Above-Average Shopping Transfer (OTP)",
        description: "Payment amount (₹16,000) exceeds 3x sender historical average (₹4,965).",
        sender: "A0002",
        senderName: "Charan Nair (Professional)",
        receiver: "A0031",
        receiverName: "FreshMart85 (Merchant)",
        amount: 16000,
        purpose: "SHOPPING",
        isNewReceiver: true,
        transactionsLast10Min: 0,
        time: null,
        tag: "3.2x Amount Spike • Step-Up OTP",
        expectedFlow: "🟡 Step-Up Challenge: SMS / WhatsApp OTP",
      },
      {
        id: "med-3",
        title: "Moderate Education Fee Transfer (OTP)",
        description: "Payment to a student recipient triggering standard two-factor verification.",
        sender: "A0001",
        senderName: "Rahul Sharma (Professional)",
        receiver: "A0014",
        receiverName: "Sneha Verma (Student)",
        amount: 14500,
        purpose: "EDUCATION",
        isNewReceiver: true,
        transactionsLast10Min: 0,
        time: null,
        tag: "New Payee • Moderate Spike",
        expectedFlow: "🟡 Step-Up Challenge: SMS / WhatsApp OTP",
      },
    ],
  },
  {
    category: "HIGH",
    categoryLabel: "High Risk",
    subLabel: "Face Biometric",
    icon: "🔵",
    authBadge: "Requires Live Face Biometric",
    themeColor: "#2563EB",
    bgColor: "#EFF6FF",
    borderColor: "#93C5FD",
    badgeBg: "#DBEAFE",
    tagline: "Late-Night Anomalies & Velocity Bursts (Score 61-85%)",
    scenarios: [
      {
        id: "high-1",
        title: "Late-Night Transfer Anomaly (Face Scan)",
        description: "Payment initiated at 02:30 AM night with a 4.5x amount spike to a new recipient.",
        sender: "A0001",
        senderName: "Rahul Sharma (Professional)",
        receiver: "A0014",
        receiverName: "Sneha Verma (Student)",
        amount: 22000,
        purpose: "OTHER",
        isNewReceiver: true,
        transactionsLast10Min: 0,
        time: "2026-09-22T02:30",
        tag: "4.5x Spike + 02:30 AM Night Off-Hours",
        expectedFlow: "🔵 Step-Up Challenge: Adaptive Face Recognition",
      },
      {
        id: "high-2",
        title: "High-Velocity Burst Transfer (Face Scan)",
        description: "Burst velocity (2 prior txns in 10 mins) with 5x value spike to new counterparty.",
        sender: "A0002",
        senderName: "Charan Nair (Professional)",
        receiver: "A0010",
        receiverName: "Priya Gupta (Professional)",
        amount: 26000,
        purpose: "INVESTMENT",
        isNewReceiver: true,
        transactionsLast10Min: 2,
        time: null,
        tag: "Velocity Spike (2 in 10m) + 5x Value",
        expectedFlow: "🔵 Step-Up Challenge: Adaptive Face Recognition",
      },
      {
        id: "high-3",
        title: "Student High-Value Transfer (Face Scan)",
        description: "Student sending ₹35,000 (8x student limit) to a newly added merchant during daytime.",
        sender: "A0014",
        senderName: "Sneha Verma (Student)",
        receiver: "A0031",
        receiverName: "FreshMart85 (Merchant)",
        amount: 35000,
        purpose: "SHOPPING",
        isNewReceiver: true,
        transactionsLast10Min: 1,
        time: null,
        tag: "8x Student Limit Spike + New Payee",
        expectedFlow: "🔵 Step-Up Challenge: Adaptive Face Recognition",
      },
    ],
  },
  {
    category: "CRITICAL",
    categoryLabel: "Critical Block",
    subLabel: "Security Freeze",
    icon: "🔴",
    authBadge: "Security Freeze",
    themeColor: "#DC2626",
    bgColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    badgeBg: "#FEE2E2",
    tagline: "Suspended Payees, Massive Spikes & Prohibited Patterns (Score >80%)",
    scenarios: [
      {
        id: "crit-1",
        title: "Crypto Transfer to Suspended Account",
        description: "38x amount spike sent to an account under security suspension at 04:00 AM.",
        sender: "A0001",
        senderName: "Rahul Sharma (Professional)",
        receiver: "A0026",
        receiverName: "Anjali Patel (Account Suspended)",
        amount: 185000,
        purpose: "CRYPTOCURRENCY",
        isNewReceiver: true,
        transactionsLast10Min: 2,
        time: "2026-09-22T04:00",
        tag: "Suspended Account + 04:00 AM Crypto",
        expectedFlow: "🔴 Auto-Frozen / Blocked by AI Engine",
      },
      {
        id: "crit-2",
        title: "High-Risk Gambling to Blocked Recipient",
        description: "Direct gambling payout to a permanently blocked beneficiary with extreme anomaly.",
        sender: "A0004",
        senderName: "Amit Verma (Professional)",
        receiver: "A0091",
        receiverName: "Meera Shetty (Account Blocked)",
        amount: 350000,
        purpose: "GAMBLING",
        isNewReceiver: true,
        transactionsLast10Min: 4,
        time: "2026-09-22T01:45",
        tag: "Blocked Beneficiary + Gambling Flag",
        expectedFlow: "🔴 Auto-Frozen / Blocked by AI Engine",
      },
    ],
  },
];

function DemoRiskScenarios({ onSelectScenario, selectedScenarioId }) {
  const [activeCategory, setActiveCategory] = useState("MEDIUM");

  const selectedCategoryData = DEMO_SCENARIOS.find(
    (c) => c.category === activeCategory
  ) || DEMO_SCENARIOS[0];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
      }}
    >
      {/* SECTION HEADER */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "16px",
          padding: "20px 24px",
          border: "1px solid #E2E8F0",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
          <span style={{ fontSize: "20px" }}>⚡</span>
          <h3 style={{ margin: 0, fontSize: "17px", fontWeight: "700", color: "#0F172A" }}>
            Live Fraud Demo Scenarios
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: "13px", color: "#64748B", lineHeight: "20px" }}>
          Choose a risk level below to explore how the AI Engine dynamically enforces <strong>Direct Execution</strong>, <strong>SMS OTP</strong>, <strong>Face Recognition</strong>, or <strong>Auto Freeze</strong>.
        </p>
      </div>

      {/* HORIZONTAL CATEGORY SEGMENTED TABS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          background: "#F1F5F9",
          padding: "6px",
          borderRadius: "14px",
        }}
      >
        {DEMO_SCENARIOS.map((group) => {
          const isActive = activeCategory === group.category;
          return (
            <button
              key={group.category}
              type="button"
              onClick={() => setActiveCategory(group.category)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "10px 8px",
                borderRadius: "10px",
                border: "none",
                background: isActive ? "#FFFFFF" : "transparent",
                cursor: "pointer",
                transition: "all 0.2s ease",
                boxShadow: isActive ? "0 2px 8px rgba(0,0,0,0.08)" : "none",
                outline: "none",
                gap: "3px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{ fontSize: "13px" }}>{group.icon}</span>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: isActive ? "700" : "600",
                    color: isActive ? group.themeColor : "#475569",
                  }}
                >
                  {group.categoryLabel}
                </span>
              </div>
              <span
                style={{
                  fontSize: "10px",
                  color: isActive ? "#64748B" : "#94A3B8",
                  fontWeight: "500",
                }}
              >
                {group.subLabel}
              </span>
            </button>
          );
        })}
      </div>

      {/* INDEPENDENT SCENARIO CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "12px",
        }}
      >
        {selectedCategoryData.scenarios.map((sc) => {
          const isSelected = selectedScenarioId === sc.id;
          return (
            <div
              key={sc.id}
              onClick={() => onSelectScenario(sc)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectScenario(sc);
              }}
              style={{
                background: "#FFFFFF",
                border: isSelected
                  ? `2px solid ${selectedCategoryData.themeColor}`
                  : "1px solid #E2E8F0",
                borderRadius: "12px",
                padding: "12px 14px",
                cursor: "pointer",
                boxShadow: isSelected
                  ? `0 4px 14px ${selectedCategoryData.themeColor}22`
                  : "0 1px 3px rgba(0,0,0,0.03)",
                transition: "all 0.18s ease",
                transform: isSelected ? "translateY(-1px)" : "none",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* SENDER -> RECEIVER ROUTE */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "#F8FAFC",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  color: "#334155",
                  border: "1px solid #F1F5F9",
                }}
              >
                <div>
                  <span style={{ color: "#94A3B8", fontSize: "11px" }}>From: </span>
                  <strong>{sc.sender}</strong> ({sc.senderName.split(" ")[0]})
                </div>
                <span style={{ color: "#94A3B8", fontWeight: "bold", padding: "0 6px" }}>➔</span>
                <div>
                  <span style={{ color: "#94A3B8", fontSize: "11px" }}>To: </span>
                  <strong>{sc.receiver}</strong> ({sc.receiverName.split(" ")[0]})
                </div>
              </div>

              {/* ACTION BUTTON */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectScenario(sc);
                }}
                style={{
                  width: "100%",
                  background: isSelected
                    ? selectedCategoryData.themeColor
                    : "#F1F5F9",
                  color: isSelected ? "#FFFFFF" : "#334155",
                  border: "none",
                  padding: "7px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {isSelected ? "✓ Active Scenario" : "Load Scenario →"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default DemoRiskScenarios;
