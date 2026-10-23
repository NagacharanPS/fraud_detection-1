import React, { useState } from "react";
import {
  FaChevronDown,
  FaChevronUp,
  FaBolt,
  FaCheck,
  FaInfoCircle,
  FaArrowRight,
  FaShieldAlt,
  FaUserCheck,
  FaBan,
} from "react-icons/fa";

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
    description: "Routine transactions within regular limits to verified recipients. Processed directly with standard execution.",
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
    description: "Transactions with new beneficiaries or moderate amount spikes. Requires SMS/WhatsApp OTP step-up verification.",
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
    description: "High-value spikes, rapid velocity bursts, or off-hours transfers. Enforces live AI adaptive facial recognition.",
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
    description: "Prohibited merchant categories, accounts under regulatory suspension, or extreme anomaly bursts. Automatically frozen by AI Engine.",
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
  // 1. Initial State: Collapsed by default
  const [isExpanded, setIsExpanded] = useState(false);

  // 2. State: Selected risk category (null by default when section is opened)
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Hover state for interactive category cards
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Toggle expand/collapse with consistent state reset
  const handleToggleExpand = () => {
    setIsExpanded((prev) => {
      // Clear category selection on collapse and whenever reopening
      setSelectedCategory(null);
      return !prev;
    });
  };

  const selectedCategoryData = selectedCategory
    ? DEMO_SCENARIOS.find((c) => c.category === selectedCategory) || null
    : null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        background: "#FFFFFF",
        borderRadius: "16px",
        border: "1px solid #E2E8F0",
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        overflow: "hidden",
        transition: "all 0.25s ease",
      }}
    >
      {/* 1. EXPANDABLE HEADER */}
      <button
        type="button"
        id="demo-scenarios-toggle-btn"
        onClick={handleToggleExpand}
        aria-expanded={isExpanded}
        aria-controls="demo-scenarios-content"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 24px",
          background: isExpanded ? "#F8FAFC" : "#FFFFFF",
          border: "none",
          borderBottom: isExpanded ? "1px solid #E2E8F0" : "none",
          cursor: "pointer",
          textAlign: "left",
          transition: "background 0.2s ease",
          outline: "none",
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.background = "#F8FAFC";
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.background = "#FFFFFF";
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "#EEF2FF",
              color: "#4F46E5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
          >
            <FaBolt />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "17px",
                  fontWeight: "700",
                  color: "#0F172A",
                  letterSpacing: "-0.01em",
                }}
              >
                Demo Scenarios
              </h2>
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: "600",
                  padding: "2px 8px",
                  borderRadius: "12px",
                  background: isExpanded ? "#E0E7FF" : "#F1F5F9",
                  color: isExpanded ? "#4338CA" : "#64748B",
                  transition: "all 0.2s ease",
                }}
              >
                {isExpanded ? (selectedCategory ? "Category Active" : "Select Category") : "Interactive"}
              </span>
            </div>
            <p
              style={{
                margin: "3px 0 0",
                fontSize: "13px",
                color: "#64748B",
                lineHeight: "18px",
              }}
            >
              Explore pre-built transaction scenarios across different risk levels.
            </p>
          </div>
        </div>

        {/* EXPAND/COLLAPSE INDICATOR */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#475569",
            fontSize: "13px",
            fontWeight: "500",
          }}
        >
          <span style={{ fontSize: "12px", color: "#64748B" }}>
            {isExpanded ? "Collapse" : "Explore Scenarios"}
          </span>
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              background: "#F1F5F9",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#334155",
              transition: "transform 0.2s ease",
            }}
          >
            {isExpanded ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
          </div>
        </div>
      </button>

      {/* 2. EXPANDED CONTENT BODY */}
      {isExpanded && (
        <div
          id="demo-scenarios-content"
          style={{
            padding: "20px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* STEP 1: SELECTABLE RISK CATEGORIES (4 Evenly Spaced Cards) */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "10px",
              }}
            >
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  color: "#64748B",
                }}
              >
                1. Select Risk Category
              </span>
              {selectedCategory && (
                <button
                  type="button"
                  onClick={() => setSelectedCategory(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    fontSize: "12px",
                    color: "#64748B",
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "10px",
              }}
            >
              {DEMO_SCENARIOS.map((group) => {
                const isSelected = selectedCategory === group.category;
                const isHovered = hoveredCategory === group.category;

                return (
                  <button
                    key={group.category}
                    id={`risk-category-btn-${group.category.toLowerCase()}`}
                    type="button"
                    onClick={() => setSelectedCategory(group.category)}
                    onMouseEnter={() => setHoveredCategory(group.category)}
                    onMouseLeave={() => setHoveredCategory(null)}
                    aria-pressed={isSelected}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      padding: "14px 16px",
                      borderRadius: "12px",
                      border: isSelected
                        ? `2px solid ${group.themeColor}`
                        : isHovered
                        ? `1.5px solid ${group.themeColor}88`
                        : "1.5px solid #E2E8F0",
                      background: isSelected
                        ? group.bgColor
                        : isHovered
                        ? "#F8FAFC"
                        : "#FFFFFF",
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      boxShadow: isSelected
                        ? `0 4px 12px ${group.themeColor}22`
                        : isHovered
                        ? "0 2px 6px rgba(0,0,0,0.05)"
                        : "none",
                      transform: isSelected || isHovered ? "translateY(-1px)" : "none",
                      outline: "none",
                      position: "relative",
                      textAlign: "left",
                      gap: "4px",
                    }}
                  >
                    {/* TOP ROW: ICON + TITLE + BADGE */}
                    <div
                      style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "16px", lineHeight: 1 }}>{group.icon}</span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: isSelected ? "700" : "600",
                            color: isSelected ? group.themeColor : "#0F172A",
                          }}
                        >
                          {group.categoryLabel}
                        </span>
                      </div>
                      {isSelected ? (
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "3px",
                            fontSize: "10px",
                            fontWeight: "700",
                            background: group.themeColor,
                            color: "#FFFFFF",
                            padding: "2px 6px",
                            borderRadius: "10px",
                          }}
                        >
                          <FaCheck size={9} /> Selected
                        </span>
                      ) : (
                        <span
                          style={{
                            fontSize: "11px",
                            color: "#94A3B8",
                            fontWeight: "500",
                          }}
                        >
                          {group.scenarios.length} scenarios
                        </span>
                      )}
                    </div>

                    {/* SUB-LABEL / ACTION REQUIREMENT */}
                    <span
                      style={{
                        fontSize: "12px",
                        color: isSelected ? "#334155" : "#64748B",
                        fontWeight: "500",
                        marginTop: "2px",
                      }}
                    >
                      {group.subLabel}
                    </span>

                    {/* SUBTLE AUTH REQUIREMENT PILL */}
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "11px",
                        fontWeight: "600",
                        color: isSelected ? group.themeColor : "#64748B",
                        background: isSelected ? group.badgeBg : "#F1F5F9",
                        padding: "3px 8px",
                        borderRadius: "6px",
                        display: "inline-block",
                      }}
                    >
                      {group.authBadge}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* STEP 2: SCENARIOS AREA */}
          {/* A. EMPTY STATE: NO CATEGORY SELECTED YET */}
          {!selectedCategory && (
            <div
              id="scenarios-empty-instruction"
              style={{
                background: "#F8FAFC",
                border: "1.5px dashed #CBD5E1",
                borderRadius: "12px",
                padding: "28px 20px",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: "#E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#64748B",
                  fontSize: "16px",
                }}
              >
                <FaInfoCircle />
              </div>
              <h4
                style={{
                  margin: 0,
                  fontSize: "14px",
                  fontWeight: "600",
                  color: "#334155",
                }}
              >
                Select a risk category to view available scenarios.
              </h4>
              <p
                style={{
                  margin: 0,
                  fontSize: "12px",
                  color: "#64748B",
                  maxWidth: "460px",
                  lineHeight: "18px",
                }}
              >
                Choose between Low Risk, Medium Risk, High Risk, or Critical Block above to explore pre-configured counterparty profiles and test adaptive step-up authentication.
              </p>
            </div>
          )}

          {/* B. POPULATED STATE: SPECIFIC CATEGORY SELECTED */}
          {selectedCategory && selectedCategoryData && (
            <div
              id="selected-category-scenarios-section"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              {/* CATEGORY SECTION HEADER & DESCRIPTION */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "12px 16px",
                  background: selectedCategoryData.bgColor,
                  border: `1px solid ${selectedCategoryData.borderColor}`,
                  borderRadius: "10px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "16px" }}>{selectedCategoryData.icon}</span>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: "15px",
                        fontWeight: "700",
                        color: "#0F172A",
                      }}
                    >
                      {selectedCategoryData.categoryLabel} Scenarios
                    </h3>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: selectedCategoryData.themeColor,
                        background: selectedCategoryData.badgeBg,
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      {selectedCategoryData.authBadge}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748B",
                    }}
                  >
                    Showing {selectedCategoryData.scenarios.length} scenarios
                  </span>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12.5px",
                    color: "#475569",
                    lineHeight: "18px",
                  }}
                >
                  {selectedCategoryData.tagline} — {selectedCategoryData.description}
                </p>
              </div>

              {/* SCENARIO CARDS RESPONSIVE GRID */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
                  gap: "14px",
                }}
              >
                {selectedCategoryData.scenarios.map((sc) => {
                  const isSelected = selectedScenarioId === sc.id;

                  return (
                    <div
                      key={sc.id}
                      id={`scenario-card-${sc.id}`}
                      style={{
                        background: "#FFFFFF",
                        border: isSelected
                          ? `2px solid ${selectedCategoryData.themeColor}`
                          : "1px solid #E2E8F0",
                        borderRadius: "12px",
                        padding: "14px",
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
                      {/* CARD TOP: TITLE + AMOUNT */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          justifyContent: "space-between",
                          gap: "8px",
                        }}
                      >
                        <div>
                          <h4
                            style={{
                              margin: 0,
                              fontSize: "13.5px",
                              fontWeight: "700",
                              color: "#0F172A",
                              lineHeight: "18px",
                            }}
                          >
                            {sc.title}
                          </h4>
                          {sc.tag && (
                            <span
                              style={{
                                display: "inline-block",
                                fontSize: "11px",
                                color: "#64748B",
                                fontWeight: "500",
                                marginTop: "2px",
                              }}
                            >
                              {sc.tag}
                            </span>
                          )}
                        </div>

                        {/* AMOUNT BADGE */}
                        <div
                          style={{
                            background: "#F1F5F9",
                            padding: "4px 8px",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "700",
                            color: "#0F172A",
                            flexShrink: 0,
                          }}
                        >
                          ₹{sc.amount.toLocaleString()}
                        </div>
                      </div>

                      {/* DESCRIPTION */}
                      {sc.description && (
                        <p
                          style={{
                            margin: 0,
                            fontSize: "12px",
                            color: "#475569",
                            lineHeight: "17px",
                          }}
                        >
                          {sc.description}
                        </p>
                      )}

                      {/* SENDER -> RECEIVER ROUTE BOX */}
                      <div
                        style={{
                          background: "#F8FAFC",
                          border: "1px solid #F1F5F9",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          fontSize: "11.5px",
                          color: "#334155",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "6px",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: "#94A3B8", fontSize: "10.5px" }}>From: </span>
                          <strong>{sc.sender}</strong>
                          <div
                            style={{
                              fontSize: "10.5px",
                              color: "#64748B",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "130px",
                            }}
                          >
                            {sc.senderName}
                          </div>
                        </div>

                        <span
                          style={{
                            color: "#94A3B8",
                            fontWeight: "bold",
                            padding: "0 4px",
                            flexShrink: 0,
                          }}
                        >
                          ➔
                        </span>

                        <div
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            textAlign: "right",
                          }}
                        >
                          <span style={{ color: "#94A3B8", fontSize: "10.5px" }}>To: </span>
                          <strong>{sc.receiver}</strong>
                          <div
                            style={{
                              fontSize: "10.5px",
                              color: "#64748B",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: "130px",
                            }}
                          >
                            {sc.receiverName}
                          </div>
                        </div>
                      </div>

                      {/* EXPECTED CHALLENGE FLOW NOTE */}
                      {sc.expectedFlow && (
                        <div
                          style={{
                            fontSize: "11px",
                            fontWeight: "600",
                            color: selectedCategoryData.themeColor,
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          {sc.expectedFlow}
                        </div>
                      )}

                      {/* ACTION: LOAD SCENARIO BUTTON */}
                      <button
                        type="button"
                        id={`load-scenario-btn-${sc.id}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectScenario(sc);
                        }}
                        style={{
                          width: "100%",
                          marginTop: "2px",
                          background: isSelected
                            ? selectedCategoryData.themeColor
                            : "#F1F5F9",
                          color: isSelected ? "#FFFFFF" : "#1E293B",
                          border: isSelected
                            ? "none"
                            : "1px solid #E2E8F0",
                          padding: "8px 14px",
                          borderRadius: "8px",
                          fontSize: "12px",
                          fontWeight: "600",
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "#E2E8F0";
                            e.currentTarget.style.borderColor = "#CBD5E1";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            e.currentTarget.style.background = "#F1F5F9";
                            e.currentTarget.style.borderColor = "#E2E8F0";
                          }
                        }}
                      >
                        {isSelected ? (
                          <>
                            <FaCheck size={11} /> Active in Simulator
                          </>
                        ) : (
                          <>
                            Load Scenario <FaArrowRight size={10} />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DemoRiskScenarios;
