import React, { useState, useEffect, useRef, useMemo } from "react";
import CytoscapeComponent from "react-cytoscapejs";
import API from "../api";
import {
  FaSearch,
  FaFilter,
  FaShieldAlt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaExpand,
  FaCompress,
  FaSync,
  FaRedo,
  FaEye,
  FaEyeSlash,
  FaProjectDiagram,
  FaNetworkWired,
  FaArrowRight,
  FaTimes,
  FaUserCheck,
  FaUserShield,
  FaMoneyBillWave,
  FaInfoCircle,
  FaSlidersH,
  FaCompass,
  FaHistory,
} from "react-icons/fa";

function TransactionGraph({ initialTxnId, onClearTargetTxn }) {
  // Graph Data State
  const [graphData, setGraphData] = useState({
    summary: {
      total_dataset_accounts: 0,
      total_dataset_transactions: 0,
      total_dataset_suspicious: 0,
      displayed_accounts: 0,
      displayed_transactions: 0,
      suspicious_transactions: 0,
      classification_source: "Ground-Truth Fraud Registry & Multi-Stage AI Risk Engine",
    },
    patterns: {},
    nodes: [],
    edges: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL"); // ALL, LOW, MEDIUM, HIGH, CRITICAL
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [patternFilter, setPatternFilter] = useState("all"); // all, fan_out, fan_in, circular, rapid, multi_hop
  const [limit, setLimit] = useState(120);
  const [minAmount, setMinAmount] = useState("");
  const [showLabels, setShowLabels] = useState(true);
  const [activeLayout, setActiveLayout] = useState("cose"); // cose, concentric, circle, breadthfirst

  // Targeted Transaction Selection (from Risk Assessment navigation)
  const [targetTxnId, setTargetTxnId] = useState(initialTxnId || "");
  const [targetNotFoundNote, setTargetNotFoundNote] = useState(null);

  // Account History Expansion State
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [expandingAccountId, setExpandingAccountId] = useState(null);
  const [expansionNote, setExpansionNote] = useState(null);

  // Interaction Panels State
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedEdge, setSelectedEdge] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [investigatingAccount, setInvestigatingAccount] = useState(null);
  const [accountAuditDetail, setAccountAuditDetail] = useState(null);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [investigatingFraudTxn, setInvestigatingFraudTxn] = useState(null);

  // Cytoscape Reference and Request Sequence Tracker
  const cyRef = useRef(null);
  const reqSeqRef = useRef(0);

  // Load Graph Data from API
  const fetchGraph = async (overrideAccountId = null) => {
    const seq = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      setTargetNotFoundNote(null);

      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      if (overrideAccountId) {
        params.append("account_id", overrideAccountId);
      } else if (searchQuery.trim()) {
        params.append("search", searchQuery.trim());
      }
      if (riskFilter !== "ALL") params.append("risk_level", riskFilter);
      if (suspiciousOnly) params.append("suspicious_only", "true");
      if (patternFilter !== "all") params.append("pattern", patternFilter);
      if (minAmount && Number(minAmount) > 0) params.append("min_amount", minAmount);
      if (targetTxnId) params.append("transaction_id", targetTxnId);

      const res = await API.get(`/api/graph?${params.toString()}`);
      if (seq === reqSeqRef.current && res.data) {
        setGraphData(res.data);
      }
    } catch (err) {
      if (seq === reqSeqRef.current) {
        console.error("Failed to load network graph data:", err);
        setError("Unable to load transaction graph data from database.");
      }
    } finally {
      if (seq === reqSeqRef.current) {
        setLoading(false);
      }
    }
  };

  // Targeted transaction retrieval & highlighting within broader network
  const loadTargetTransaction = async (txnId) => {
    if (!txnId) return;
    const cleanTxnId = txnId.trim();
    const seq = ++reqSeqRef.current;
    try {
      setLoading(true);
      setError(null);
      setTargetNotFoundNote(null);
      setSelectedNode(null);
      setSelectedEdge(null);

      // Query broader network with target transaction guaranteed to be incorporated
      const params = new URLSearchParams();
      params.append("limit", limit.toString());
      params.append("transaction_id", cleanTxnId);
      if (riskFilter !== "ALL") params.append("risk_level", riskFilter);
      if (suspiciousOnly) params.append("suspicious_only", "true");
      if (patternFilter !== "all") params.append("pattern", patternFilter);

      const res = await API.get(`/api/graph?${params.toString()}`);
      if (seq === reqSeqRef.current && res.data) {
        setGraphData(res.data);
        const matchingEdge = res.data.edges?.find((e) => e.data?.id === cleanTxnId);
        if (matchingEdge) {
          setSelectedEdge(matchingEdge.data);
          setTimeout(() => {
            if (cyRef.current) {
              const cy = cyRef.current;
              cy.elements().removeClass("targeted-highlight highlighted dimmed");
              const cyEdge = cy.getElementById(cleanTxnId);
              if (cyEdge && cyEdge.length > 0) {
                const connected = cyEdge.connectedNodes().add(cyEdge);
                connected.addClass("targeted-highlight");
                const neighborhood = connected.neighborhood().add(connected);
                cy.animate({
                  fit: { eles: neighborhood.length > 2 ? neighborhood : connected, padding: 80 },
                  duration: 450,
                });
              }
            }
          }, 400);
        } else {
          setTargetNotFoundNote(`This transaction (${cleanTxnId}) could not be loaded into the graph.`);
        }
      }
    } catch (err) {
      if (seq === reqSeqRef.current) {
        console.error("Failed to load targeted transaction:", err);
        setTargetNotFoundNote(`This transaction (${cleanTxnId}) could not be loaded into the graph.`);
      }
    } finally {
      if (seq === reqSeqRef.current) {
        setLoading(false);
      }
    }
  };

  // Expand an account's real incoming & outgoing transactions into the active graph
  const expandAccountHistory = async (accountId, roleLabel = "") => {
    if (!accountId) return;
    const cleanId = accountId.trim();
    setExpandingAccountId(cleanId);
    setExpansionNote(null);

    try {
      const res = await API.get(`/api/graph/account/${encodeURIComponent(cleanId)}/history?limit=60`);
      const historyData = res.data;
      if (!historyData) return;

      const cy = cyRef.current;
      if (!cy) return;

      const existingNodeIds = new Set(cy.nodes().map((n) => n.id()));
      const existingEdgeIds = new Set(cy.edges().map((e) => e.id()));

      const newNodes = (historyData.nodes || []).filter((n) => !existingNodeIds.has(n.data.id));
      const newEdges = (historyData.edges || []).filter((e) => !existingEdgeIds.has(e.data.id));

      if (newNodes.length === 0 && newEdges.length === 0) {
        setExpansionNote(
          `All historical transactions for ${cleanId} are already visible in the graph (${historyData.total_transactions || 0} total: ${historyData.total_incoming || 0} incoming, ${historyData.total_outgoing || 0} outgoing).`
        );
        setTimeout(() => setExpansionNote(null), 5000);
        return;
      }

      // Add elements to Cytoscape
      cy.batch(() => {
        // Find position of the anchor account node if it exists
        const anchorNode = cy.getElementById(cleanId);
        const anchorPos = anchorNode.length > 0 ? anchorNode.position() : { x: 400, y: 300 };

        // Position newly added nodes in an orbit around the anchor node
        newNodes.forEach((node, idx) => {
          const angle = (idx / Math.max(newNodes.length, 1)) * 2 * Math.PI;
          const radius = 130 + (idx % 3) * 35;
          const pos = {
            x: anchorPos.x + radius * Math.cos(angle),
            y: anchorPos.y + radius * Math.sin(angle),
          };
          cy.add({
            group: "nodes",
            data: node.data,
            position: pos,
          });
        });

        // Add newly discovered directed edges
        newEdges.forEach((edge) => {
          cy.add({
            group: "edges",
            data: edge.data,
          });
        });

        // Ensure the targeted transaction remains highlighted
        if (targetTxnId) {
          const targetEdge = cy.getElementById(targetTxnId);
          if (targetEdge.length > 0) {
            targetEdge.addClass("targeted-highlight");
            targetEdge.connectedNodes().addClass("targeted-highlight");
          }
        }
      });

      // Update React state
      setGraphData((prev) => ({
        ...prev,
        nodes: [...prev.nodes, ...newNodes],
        edges: [...prev.edges, ...newEdges],
      }));

      setExpandedAccounts((prev) => new Set([...prev, cleanId]));

      const inCount = historyData.incoming_transactions?.length || 0;
      const outCount = historyData.outgoing_transactions?.length || 0;
      setExpansionNote(
        `Expanded ${newEdges.length} new historical transaction(s) for ${cleanId} (${inCount} incoming, ${outCount} outgoing) into the active network.`
      );
      setTimeout(() => setExpansionNote(null), 6000);

      // Smoothly animate viewport to encompass the expanded neighborhood
      const anchorNode = cy.getElementById(cleanId);
      if (anchorNode.length > 0) {
        const neighborhood = anchorNode.closedNeighborhood();
        cy.animate({
          fit: { eles: neighborhood, padding: 60 },
          duration: 400,
        });
      }
    } catch (err) {
      console.error("Failed to expand account history:", err);
      setExpansionNote(`Unable to expand historical transactions for ${cleanId}.`);
    } finally {
      setExpandingAccountId(null);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const effectiveTxn = initialTxnId || urlParams.get("txn");
    if (effectiveTxn) {
      setTargetTxnId(effectiveTxn);
      loadTargetTransaction(effectiveTxn);
    } else {
      fetchGraph();
    }
  }, [initialTxnId, riskFilter, suspiciousOnly, patternFilter, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchGraph();
  };

  const resetAllFilters = async () => {
    const seq = ++reqSeqRef.current;
    setSearchQuery("");
    setRiskFilter("ALL");
    setSuspiciousOnly(false);
    setPatternFilter("all");
    setMinAmount("");
    setLimit(120);
    setSelectedNode(null);
    setSelectedEdge(null);
    setHoveredNode(null);
    setInvestigatingAccount(null);
    setAccountAuditDetail(null);
    setTargetTxnId("");
    setTargetNotFoundNote(null);
    setInvestigatingFraudTxn(null);
    setExpandedAccounts(new Set());
    setExpansionNote(null);
    if (onClearTargetTxn) onClearTargetTxn();

    try {
      setLoading(true);
      setError(null);
      const res = await API.get("/api/graph?limit=120");
      if (seq === reqSeqRef.current && res.data) {
        setGraphData(res.data);
      }
    } catch (err) {
      if (seq === reqSeqRef.current) {
        console.error("Failed to reset network graph:", err);
        setError("Unable to reload complete graph.");
      }
    } finally {
      if (seq === reqSeqRef.current) {
        setLoading(false);
      }
    }

    if (cyRef.current) {
      try {
        const cy = cyRef.current;
        cy.elements().unselect();
        cy.elements().removeClass("highlighted dimmed targeted-highlight");
        setTimeout(() => {
          cy.fit(undefined, 40);
          cy.center();
        }, 120);
      } catch (e) {
        console.warn("Cytoscape reset error:", e);
      }
    }
  };

  const handleResetFilters = resetAllFilters;

  // Investigate account deep details
  const handleInvestigateAccount = async (accountId) => {
    try {
      setLoadingAudit(true);
      setInvestigatingAccount(accountId);
      const res = await API.get(`/api/graph/account/${accountId}`);
      setAccountAuditDetail(res.data);
    } catch (err) {
      console.error("Failed to fetch deep account audit:", err);
    } finally {
      setLoadingAudit(false);
    }
  };

  // Expand account and 1st degree connections in active graph
  const handleExploreConnections = (accountId) => {
    expandAccountHistory(accountId, "Account");
  };

  // Cytoscape layout configuration
  const layoutConfig = useMemo(() => {
    if (activeLayout === "cose") {
      return {
        name: "cose",
        idealEdgeLength: 100,
        nodeOverlap: 20,
        refresh: 20,
        fit: true,
        padding: 40,
        randomize: false,
        componentSpacing: 100,
        nodeRepulsion: 400000,
        edgeElasticity: 100,
        nestingFactor: 5,
        gravity: 80,
        numIter: 1000,
        initialTemp: 200,
        coolingFactor: 0.95,
        minTemp: 1.0,
      };
    }
    if (activeLayout === "concentric") {
      return {
        name: "concentric",
        fit: true,
        padding: 40,
        minNodeSpacing: 50,
        concentric: (node) => (node.data("is_suspicious") ? 10 : node.data("out_degree") + node.data("in_degree")),
        levelWidth: () => 2,
      };
    }
    if (activeLayout === "breadthfirst") {
      return {
        name: "breadthfirst",
        fit: true,
        directed: true,
        padding: 40,
        spacingFactor: 1.25,
      };
    }
    return {
      name: "circle",
      fit: true,
      padding: 40,
    };
  }, [activeLayout]);

  // Cytoscape stylesheet matching the rich dark theme
  const cyStylesheet = useMemo(() => {
    return [
      // Base Node
      {
        selector: "node",
        style: {
          width: 42,
          height: 42,
          "background-color": "#0284C7", // Cyan/blue
          "background-opacity": 0.9,
          "border-width": 3,
          "border-color": "#38BDF8",
          "border-opacity": 0.8,
          label: showLabels ? "data(label)" : "",
          color: "#E2E8F0",
          "font-size": "10px",
          "font-family": "Inter, system-ui, sans-serif",
          "font-weight": 600,
          "text-valign": "bottom",
          "text-halign": "center",
          "text-margin-y": 6,
          "text-wrap": "wrap",
          "text-max-width": "90px",
          "text-background-color": "rgba(15, 23, 42, 0.85)",
          "text-background-opacity": 0.85,
          "text-background-padding": "3px",
          "text-background-shape": "roundrectangle",
          "transition-property": "background-color, border-color, width, height, border-width",
          "transition-duration": "0.2s",
        },
      },
      // Suspicious Node (Hexagon shape + Red/Orange glow)
      {
        selector: "node[?is_suspicious]",
        style: {
          shape: "hexagon",
          "background-color": "#DC2626", // Crimson Red
          "border-color": "#F87171",
          "border-width": 4,
          width: 48,
          height: 48,
        },
      },
      // Selected Node
      {
        selector: "node:selected",
        style: {
          "background-color": "#8B5CF6", // Purple highlight
          "border-color": "#DDD6FE",
          "border-width": 5,
          width: 54,
          height: 54,
        },
      },
      // Hovered / Clicked Node Focus
      {
        selector: "node.highlighted",
        style: {
          "background-color": "#F59E0B", // Amber highlight
          "border-color": "#FDE68A",
          "border-width": 5,
          width: 52,
          height: 52,
        },
      },
      // 1. Low Risk Edge (Cyan Solid)
      {
        selector: "edge[risk_level = 'LOW']",
        style: {
          width: 1.8,
          "line-color": "#0EA5E9",
          "target-arrow-color": "#38BDF8",
          "target-arrow-shape": "triangle",
          "arrow-scale": 1.1,
          "curve-style": "bezier",
          opacity: 0.75,
          label: showLabels ? "data(label)" : "",
          color: "#94A3B8",
          "font-size": "9px",
          "font-weight": 500,
          "text-background-color": "#0F172A",
          "text-background-opacity": 0.85,
          "text-background-padding": "2px",
          "text-background-shape": "roundrectangle",
          "text-rotation": "autorotate",
        },
      },
      // 2. Medium Risk Edge (Yellow Solid)
      {
        selector: "edge[risk_level = 'MEDIUM']",
        style: {
          width: 2.6,
          "line-color": "#EAB308",
          "target-arrow-color": "#FACC15",
          "target-arrow-shape": "triangle",
          "arrow-scale": 1.25,
          "curve-style": "bezier",
          opacity: 0.85,
          label: showLabels ? "data(label)" : "",
          color: "#FEF08A",
          "font-size": "9px",
          "font-weight": 600,
          "text-background-color": "#0F172A",
          "text-background-opacity": 0.85,
          "text-background-padding": "2px",
          "text-background-shape": "roundrectangle",
          "text-rotation": "autorotate",
        },
      },
      // 3. High Risk Edge (Orange Dashed)
      {
        selector: "edge[risk_level = 'HIGH']",
        style: {
          width: 3.4,
          "line-color": "#F97316",
          "line-style": "dashed",
          "line-dash-pattern": [6, 3],
          "target-arrow-color": "#FB923C",
          "target-arrow-shape": "triangle",
          "arrow-scale": 1.35,
          "curve-style": "bezier",
          opacity: 0.95,
          label: showLabels ? "data(label)" : "",
          color: "#FED7AA",
          "font-size": "9px",
          "font-weight": 700,
          "text-background-color": "#0F172A",
          "text-background-opacity": 0.85,
          "text-background-padding": "2px",
          "text-background-shape": "roundrectangle",
          "text-rotation": "autorotate",
        },
      },
      // 4. Critical Risk Edge (Crimson Red Solid)
      {
        selector: "edge[risk_level = 'CRITICAL']",
        style: {
          width: 4.4,
          "line-color": "#EF4444",
          "target-arrow-color": "#DC2626",
          "target-arrow-shape": "triangle",
          "arrow-scale": 1.5,
          "curve-style": "bezier",
          opacity: 1.0,
          label: showLabels ? "data(label)" : "",
          color: "#FCA5A5",
          "font-size": "9px",
          "font-weight": 800,
          "text-background-color": "#0F172A",
          "text-background-opacity": 0.85,
          "text-background-padding": "2px",
          "text-background-shape": "roundrectangle",
          "text-rotation": "autorotate",
        },
      },
      // Fallback base edge style
      {
        selector: "edge",
        style: {
          width: 2.0,
          "line-color": "#0EA5E9",
          "target-arrow-color": "#38BDF8",
          "target-arrow-shape": "triangle",
          "arrow-scale": 1.2,
          "curve-style": "bezier",
          opacity: 0.8,
          label: showLabels ? "data(label)" : "",
          color: "#94A3B8",
          "font-size": "9px",
          "text-background-color": "#0F172A",
          "text-background-opacity": 0.85,
          "text-rotation": "autorotate",
        },
      },
      // Selected Edge
      {
        selector: "edge:selected",
        style: {
          width: 4.5,
          "line-color": "#A855F7",
          "target-arrow-color": "#C084FC",
          opacity: 1,
        },
      },
      // Highlighted Edge
      {
        selector: "edge.highlighted",
        style: {
          width: 3.8,
          "line-color": "#F59E0B",
          "target-arrow-color": "#FBBF24",
          opacity: 1,
        },
      },
      // Dimmed elements when focusing
      {
        selector: ".dimmed",
        style: {
          opacity: 0.15,
        },
      },
      // Assessed / Targeted Transaction Edge (Prominent Amber Outline with increased width)
      {
        selector: "edge.targeted-highlight",
        style: {
          width: 5.5,
          "line-color": "#F59E0B",
          "target-arrow-color": "#D97706",
          "target-arrow-shape": "triangle",
          "arrow-scale": 1.7,
          opacity: 1,
          "z-index": 999,
        },
      },
      // Assessed / Targeted Transaction Endpoints
      {
        selector: "node.targeted-highlight",
        style: {
          "border-color": "#F59E0B",
          "border-width": 6,
          width: 56,
          height: 56,
          "z-index": 1000,
        },
      },
    ];
  }, [showLabels]);

  // Cytoscape element click, hover & drag handlers
  const handleCyInit = (cy) => {
    cyRef.current = cy;

    cy.off("tap");
    cy.off("mouseover");
    cy.off("mouseout");

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const data = node.data();
      const pos = node.renderedPosition();
      setHoveredNode({
        id: data.id,
        label: data.label,
        account_name: data.account_name,
        is_suspicious: data.is_suspicious,
        trust_score: data.trust_score,
        account_type: data.account_type,
        x: pos.x,
        y: pos.y,
      });
    });

    cy.on("mouseout", "node", () => {
      setHoveredNode(null);
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const data = node.data();
      setSelectedNode(data);
      setSelectedEdge(null);
      setHoveredNode(null);

      // Highlight 1st degree neighborhood
      cy.elements().removeClass("highlighted dimmed");
      const neighborhood = node.neighborhood().add(node);
      cy.elements().difference(neighborhood).addClass("dimmed");
      neighborhood.addClass("highlighted");
    });

    cy.on("tap", "edge", (evt) => {
      const edge = evt.target;
      const data = edge.data();
      setSelectedEdge(data);
      setSelectedNode(null);
      setHoveredNode(null);

      // Highlight edge and connected endpoints
      cy.elements().removeClass("highlighted dimmed");
      const connected = edge.connectedNodes().add(edge);
      cy.elements().difference(connected).addClass("dimmed");
      connected.addClass("highlighted");
    });

    cy.on("tap", (evt) => {
      if (evt.target === cy) {
        // Clicked background
        cy.elements().removeClass("highlighted dimmed");
        setSelectedNode(null);
        setSelectedEdge(null);
        setHoveredNode(null);
      }
    });
  };

  // Zoom controls
  const handleZoomIn = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 1.25);
  };

  const handleZoomOut = () => {
    if (cyRef.current) cyRef.current.zoom(cyRef.current.zoom() * 0.8);
  };

  const handleFit = () => {
    if (cyRef.current) cyRef.current.fit(undefined, 30);
  };

  const elements = useMemo(() => {
    return [...graphData.nodes, ...graphData.edges];
  }, [graphData.nodes, graphData.edges]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        height: "100%",
        minHeight: "750px",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Page Introduction */}
      <div
        style={{
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: "14px",
          padding: "16px 20px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
        }}
      >
        <h3
          style={{
            margin: "0 0 4px",
            fontSize: "16px",
            fontWeight: "700",
            color: "#F8FAFC",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <FaProjectDiagram style={{ color: "#38BDF8" }} /> Network Graph
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "#94A3B8" }}>
          Explore how accounts are connected through transactions and identify suspicious money flows.
        </p>
      </div>

      {/* 1. TOP SUMMARY METRIC CARDS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
          gap: "14px",
        }}
      >
        {/* Total Accounts in Dataset */}
        <div
          style={{
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "16px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(56, 189, 248, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#38BDF8",
              fontSize: "18px",
            }}
          >
            <FaUserShield />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>
              Total Dataset Accounts
            </div>
            <div style={{ fontSize: "22px", color: "#F8FAFC", fontWeight: 800 }}>
              {graphData.summary.total_dataset_accounts.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>
              Unique ledger accounts
            </div>
          </div>
        </div>

        {/* Total Transactions in Dataset */}
        <div
          style={{
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "16px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(99, 102, 241, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#818CF8",
              fontSize: "18px",
            }}
          >
            <FaNetworkWired />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>
              Total Transactions
            </div>
            <div style={{ fontSize: "22px", color: "#F8FAFC", fontWeight: 800 }}>
              {graphData.summary.total_dataset_transactions.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>
              Real historical + live records
            </div>
          </div>
        </div>

        {/* Displayed Graph Accounts */}
        <div
          style={{
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "16px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(6, 182, 212, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#06B6D4",
              fontSize: "18px",
            }}
          >
            <FaProjectDiagram />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>
              Displayed Nodes
            </div>
            <div style={{ fontSize: "22px", color: "#06B6D4", fontWeight: 800 }}>
              {graphData.summary.displayed_accounts} <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>accounts</span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>
              Active in current graph view
            </div>
          </div>
        </div>

        {/* Displayed Transactions */}
        <div
          style={{
            background: "#0F172A",
            border: "1px solid #1E293B",
            borderRadius: "14px",
            padding: "16px 20px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(16, 185, 129, 0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#10B981",
              fontSize: "18px",
            }}
          >
            <FaMoneyBillWave />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600, textTransform: "uppercase" }}>
              Displayed Edges
            </div>
            <div style={{ fontSize: "22px", color: "#10B981", fontWeight: 800 }}>
              {graphData.summary.displayed_transactions} <span style={{ fontSize: "13px", color: "#64748B", fontWeight: 500 }}>transfers</span>
            </div>
            <div style={{ fontSize: "11px", color: "#64748B" }}>
              Directed flow connections
            </div>
          </div>
        </div>

        {/* Suspicious / High-Risk Transactions */}
        <div
          style={{
            background: "#0F172A",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "14px",
            padding: "16px 20px",
            boxShadow: "0 8px 24px rgba(239, 68, 68, 0.1)",
            display: "flex",
            alignItems: "center",
            gap: "14px",
          }}
        >
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(239, 68, 68, 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#EF4444",
              fontSize: "18px",
            }}
          >
            <FaExclamationTriangle />
          </div>
          <div>
            <div style={{ fontSize: "12px", color: "#F87171", fontWeight: 700, textTransform: "uppercase" }}>
              Ground-Truth Fraud Txs
            </div>
            <div style={{ fontSize: "22px", color: "#EF4444", fontWeight: 800 }}>
              {graphData.summary.displayed_suspicious}{" "}
              <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 500 }}>
                / {graphData.summary.total_dataset_suspicious} in DB
              </span>
            </div>
            <div style={{ fontSize: "10px", color: "#FCA5A5", fontWeight: 500 }}>
              Confirmed fraud-labeled records
            </div>
          </div>
        </div>
      </div>

      {/* Targeted Transaction Banner (when navigated from Risk Assessment) */}
      {targetTxnId && (
        <div
          style={{
            background: targetNotFoundNote ? "rgba(239, 68, 68, 0.15)" : "rgba(245, 158, 11, 0.15)",
            border: `1px solid ${targetNotFoundNote ? "rgba(239, 68, 68, 0.4)" : "rgba(245, 158, 11, 0.4)"}`,
            borderRadius: "12px",
            padding: "12px 18px",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            justifyContent: "space-between",
            alignItems: "center",
            color: targetNotFoundNote ? "#FCA5A5" : "#FDE68A",
            fontSize: "13px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, minWidth: "260px" }}>
            <FaProjectDiagram style={{ color: targetNotFoundNote ? "#EF4444" : "#F59E0B" }} />
            <span>
              {targetNotFoundNote ? (
                targetNotFoundNote
              ) : (
                <>
                  Targeted Risk-Assessed Transaction: <strong>{targetTxnId}</strong>{" "}
                  {selectedEdge && (
                    <span style={{ color: "#E2E8F0", marginLeft: "6px" }}>
                      ({selectedEdge.source} → {selectedEdge.target} | {selectedEdge.formatted_amount})
                    </span>
                  )}
                  {" — "}
                  <span style={{ color: "#94A3B8" }}>
                    Highlighted in broader network ({graphData.edges?.length || 0} active transactions).
                  </span>
                </>
              )}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            {selectedEdge && (
              <>
                <button
                  type="button"
                  onClick={() => expandAccountHistory(selectedEdge.source || selectedEdge.sender_id, "Sender")}
                  disabled={expandingAccountId === (selectedEdge.source || selectedEdge.sender_id)}
                  style={{
                    background: expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id)
                      ? "rgba(16, 185, 129, 0.25)"
                      : "#1E293B",
                    border: `1px solid ${
                      expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id) ? "#10B981" : "#334155"
                    }`,
                    color: expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id) ? "#34D399" : "#38BDF8",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <FaHistory />
                  {expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id)
                    ? `Sender (${selectedEdge.source}) Expanded ✓`
                    : `+ Expand Sender (${selectedEdge.source})`}
                </button>
                <button
                  type="button"
                  onClick={() => expandAccountHistory(selectedEdge.target || selectedEdge.receiver_id, "Receiver")}
                  disabled={expandingAccountId === (selectedEdge.target || selectedEdge.receiver_id)}
                  style={{
                    background: expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id)
                      ? "rgba(16, 185, 129, 0.25)"
                      : "#1E293B",
                    border: `1px solid ${
                      expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id) ? "#10B981" : "#334155"
                    }`,
                    color: expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id) ? "#34D399" : "#38BDF8",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    cursor: "pointer",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  <FaHistory />
                  {expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id)
                    ? `Receiver (${selectedEdge.target}) Expanded ✓`
                    : `+ Expand Receiver (${selectedEdge.target})`}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setTargetTxnId("");
                setTargetNotFoundNote(null);
                if (onClearTargetTxn) onClearTargetTxn();
                fetchGraph();
              }}
              style={{
                background: "#1E293B",
                border: "1px solid #334155",
                color: "#CBD5E1",
                padding: "6px 12px",
                borderRadius: "6px",
                fontSize: "11px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Clear Target
            </button>
          </div>
        </div>
      )}

      {/* Dynamic Expansion Feedback Toast */}
      {expansionNote && (
        <div
          style={{
            background: "rgba(16, 185, 129, 0.15)",
            border: "1px solid rgba(16, 185, 129, 0.4)",
            borderRadius: "10px",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            color: "#6EE7B7",
            fontSize: "12px",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <FaCheckCircle style={{ color: "#10B981" }} />
            <span>{expansionNote}</span>
          </div>
          <button
            type="button"
            onClick={() => setExpansionNote(null)}
            style={{
              background: "transparent",
              border: "none",
              color: "#94A3B8",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            <FaTimes />
          </button>
        </div>
      )}

      {/* 2. INTERACTIVE TOOLBAR & CONTROLS */}
      <div
        style={{
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: "14px",
          padding: "14px 18px",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        {/* Left: Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: "flex",
            alignItems: "center",
            background: "#1E293B",
            borderRadius: "10px",
            padding: "2px 12px",
            border: "1px solid #334155",
            minWidth: "260px",
          }}
        >
          <FaSearch style={{ color: "#94A3B8", marginRight: "8px" }} />
          <input
            type="text"
            placeholder="Search Account ID (e.g. ACC_0557) or TXN..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: "transparent",
              border: "none",
              color: "#F8FAFC",
              padding: "8px 0",
              outline: "none",
              fontSize: "13px",
              width: "100%",
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                fetchGraph();
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "#64748B",
                cursor: "pointer",
              }}
            >
              <FaTimes />
            </button>
          )}
        </form>

        {/* Center: Filters */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Risk Level Filter */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>Risk:</span>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                background: "#1E293B",
                color: "#F8FAFC",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="ALL">All Risk Levels</option>
              <option value="LOW">Low Risk Only</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="HIGH">High Risk</option>
              <option value="CRITICAL">Critical Risk</option>
            </select>
          </div>

          {/* Suspicious Only Toggle */}
          <button
            onClick={() => setSuspiciousOnly(!suspiciousOnly)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              fontWeight: 700,
              cursor: "pointer",
              border: "none",
              background: suspiciousOnly ? "#EF4444" : "#1E293B",
              color: suspiciousOnly ? "#FFFFFF" : "#94A3B8",
              boxShadow: suspiciousOnly ? "0 0 12px rgba(239, 68, 68, 0.4)" : "none",
              transition: "all 0.2s ease",
            }}
          >
            <FaExclamationTriangle />
            Suspicious Only
          </button>

          {/* Pattern Pills Dropdown */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>Pattern:</span>
            <select
              value={patternFilter}
              onChange={(e) => setPatternFilter(e.target.value)}
              style={{
                background: "#1E293B",
                color: "#F8FAFC",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="all" title="Display all transactions without pattern constraints">All Graph Patterns</option>
              <option value="fan_out" title="Fan-Out: One sender transferring funds to multiple recipients in rapid succession (Mule Dispersal)">Fan-Out (Mule Dispersal)</option>
              <option value="fan_in" title="Fan-In: Multiple accounts sending funds into a single aggregator account">Fan-In (Aggregator / Receiver)</option>
              <option value="circular" title="Circular: Closed payment loops returning funds to the originator">Circular (Cycle Flow)</option>
              <option value="rapid" title="Rapid: High-frequency transfers within short time windows">Rapid Velocity Transfers</option>
              <option value="multi_hop" title="Multi-Hop: Chained transfers across multiple intermediary nodes">Multi-Hop Chains</option>
            </select>
          </div>

          {/* Transaction Limit Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>Limit:</span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              style={{
                background: "#1E293B",
                color: "#F8FAFC",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 8px",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="50">50 Txs</option>
              <option value="120">120 Txs (Fast)</option>
              <option value="250">250 Txs</option>
              <option value="500">500 Txs (Full)</option>
            </select>
          </div>

          {/* Layout Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 600 }}>Layout:</span>
            <select
              value={activeLayout}
              onChange={(e) => setActiveLayout(e.target.value)}
              style={{
                background: "#1E293B",
                color: "#F8FAFC",
                border: "1px solid #334155",
                borderRadius: "8px",
                padding: "6px 8px",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            >
              <option value="cose">Auto layout</option>
              <option value="concentric">Concentric Rings</option>
              <option value="breadthfirst">Hierarchical Flow</option>
              <option value="circle">Circular Ring</option>
            </select>
          </div>
        </div>

        {/* Right: View Toggles & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {/* Label Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            title="Toggle Node & Amount Labels"
            style={{
              background: showLabels ? "#0284C7" : "#1E293B",
              color: "#F8FAFC",
              border: "none",
              borderRadius: "8px",
              padding: "7px 11px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            {showLabels ? <FaEye /> : <FaEyeSlash />} {showLabels ? "Labels ON" : "Labels OFF"}
          </button>

          {/* Reset Filters */}
          <button
            onClick={handleResetFilters}
            title="Reset All Filters & Viewport"
            style={{
              background: "#1E293B",
              color: "#94A3B8",
              border: "1px solid #334155",
              borderRadius: "8px",
              padding: "7px 11px",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <FaRedo /> Reset
          </button>
        </div>
      </div>

      {/* Active Subset & Ledger Population Banner */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "10px",
          background: "#0F172A",
          border: "1px solid #1E293B",
          borderRadius: "10px",
          padding: "10px 16px",
          fontSize: "12px",
          color: "#94A3B8",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span
            style={{
              background: "rgba(56, 189, 248, 0.15)",
              color: "#38BDF8",
              padding: "2px 8px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
            }}
          >
            ACTIVE VIEW
          </span>
          <span>
            Displaying <strong style={{ color: "#F8FAFC" }}>{graphData.summary.displayed_transactions}</strong> of{" "}
            <strong style={{ color: "#F8FAFC" }}>
              {graphData.summary.total_matching_transactions ?? graphData.summary.total_dataset_transactions}
            </strong>{" "}
            matching transactions across the database ({graphData.summary.total_dataset_transactions?.toLocaleString() || "18,203"} total ledger records).
          </span>
        </div>
        {suspiciousOnly && (
          <span style={{ color: "#F87171", fontWeight: 700, fontSize: "11px", display: "flex", alignItems: "center", gap: "5px" }}>
            <FaExclamationTriangle /> Suspicious Only Mode (Ground-Truth Fraud Filter Active)
          </span>
        )}
      </div>

      {/* 3. MAIN GRAPH CANVAS & SIDEBAR PANELS */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "650px",
          background: "#080D1A",
          border: "1px solid #1E293B",
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "inset 0 2px 8px rgba(0,0,0,0.6)",
        }}
      >
        {/* Loading Overlay */}
        {loading && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(8, 13, 26, 0.8)",
              backdropFilter: "blur(4px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 30,
              gap: "12px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                border: "4px solid #1E293B",
                borderTopColor: "#38BDF8",
                animation: "spin 1s linear infinite",
              }}
            />
            <div style={{ color: "#F8FAFC", fontSize: "14px", fontWeight: 600 }}>
              Querying Transaction Graph Database...
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && elements.length === 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 20,
              gap: "14px",
              color: "#94A3B8",
            }}
          >
            <FaExclamationTriangle style={{ fontSize: "36px", color: "#F59E0B" }} />
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#F8FAFC" }}>
              No transactions match the selected filters
            </div>
            <div style={{ fontSize: "13px" }}>
              Try resetting your risk level, pattern filter, or search query.
            </div>
            <button
              onClick={handleResetFilters}
              style={{
                background: "#0284C7",
                color: "#FFFFFF",
                padding: "8px 18px",
                borderRadius: "8px",
                border: "none",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Floating Zoom Controls */}
        <div
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            zIndex: 10,
          }}
        >
          <button
            onClick={handleZoomIn}
            title="Zoom In"
            style={{
              width: "36px",
              height: "36px",
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#F8FAFC",
              fontSize: "16px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            +
          </button>
          <button
            onClick={handleZoomOut}
            title="Zoom Out"
            style={{
              width: "36px",
              height: "36px",
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#F8FAFC",
              fontSize: "16px",
              fontWeight: 800,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            -
          </button>
          <button
            onClick={handleFit}
            title="Fit to Screen"
            style={{
              width: "36px",
              height: "36px",
              background: "#1E293B",
              border: "1px solid #334155",
              borderRadius: "8px",
              color: "#38BDF8",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <FaCompress />
          </button>
        </div>

        {/* Floating Legend */}
        <div
          style={{
            position: "absolute",
            bottom: "16px",
            left: "16px",
            background: "rgba(15, 23, 42, 0.94)",
            border: "1px solid #1E293B",
            backdropFilter: "blur(8px)",
            borderRadius: "10px",
            padding: "10px 14px",
            fontSize: "11px",
            color: "#E2E8F0",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            boxShadow: "0 6px 18px rgba(0,0,0,0.5)",
            maxWidth: "320px",
          }}
        >
          <div style={{ fontWeight: 700, color: "#94A3B8", textTransform: "uppercase", fontSize: "10px" }}>
            Network Risk Legend
          </div>
          {/* Node Types */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                background: "#0284C7",
                border: "2px solid #38BDF8",
                display: "inline-block",
              }}
            />
            <span>Normal Account (Circle)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "2px",
                transform: "rotate(45deg)",
                background: "#DC2626",
                border: "2px solid #F87171",
                display: "inline-block",
              }}
            />
            <span style={{ color: "#FCA5A5", fontWeight: 600 }}>Suspicious / Flagged Node (Hexagon)</span>
          </div>

          <div style={{ height: "1px", background: "#334155", margin: "2px 0" }} />

          {/* 4 Risk Levels */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "18px", height: "2px", background: "#0EA5E9", display: "inline-block" }} />
            <span>Low Risk Transfer (&lt;30 score, Cyan solid)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "18px", height: "3px", background: "#EAB308", display: "inline-block" }} />
            <span style={{ color: "#FEF08A" }}>Medium Risk (30-59 score, Yellow solid)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "18px", height: "3px", borderTop: "2px dashed #F97316", display: "inline-block" }} />
            <span style={{ color: "#FED7AA" }}>High Risk (60-79 score, Orange dashed)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "18px", height: "4px", background: "#EF4444", display: "inline-block" }} />
            <span style={{ color: "#FCA5A5", fontWeight: 700 }}>Critical Risk (&ge;80 score, Red thick)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: "18px", height: "4px", background: "#F59E0B", border: "1px solid #FDE68A", display: "inline-block" }} />
            <span style={{ color: "#FDE68A", fontWeight: 700 }}>Targeted Assessed Flow (Amber outline)</span>
          </div>
        </div>

        {/* Hover Tooltip */}
        {hoveredNode && !selectedNode && (
          <div
            style={{
              position: "absolute",
              left: Math.min(Math.max(hoveredNode.x + 15, 10), 750),
              top: Math.max(hoveredNode.y - 45, 10),
              pointerEvents: "none",
              background: "rgba(15, 23, 42, 0.95)",
              border: `1px solid ${hoveredNode.is_suspicious ? "#F87171" : "#38BDF8"}`,
              borderRadius: "8px",
              padding: "8px 12px",
              color: "#F8FAFC",
              fontSize: "12px",
              zIndex: 50,
              boxShadow: "0 4px 14px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ fontWeight: 700, color: hoveredNode.is_suspicious ? "#F87171" : "#38BDF8" }}>
              {hoveredNode.account_id || hoveredNode.id}
            </div>
            <div style={{ fontSize: "11px", color: "#94A3B8" }}>
              {hoveredNode.is_verified_identity &&
              hoveredNode.account_name &&
              hoveredNode.account_name !== "Name not available" &&
              hoveredNode.account_name !== "Unknown" ? (
                <span style={{ color: "#E2E8F0", fontWeight: 600 }}>{hoveredNode.account_name} • </span>
              ) : null}
              Trust: {hoveredNode.trust_score !== "Unknown" ? `${hoveredNode.trust_score}/100` : "Unknown"}
            </div>
            <div
              style={{
                fontSize: "11px",
                marginTop: "3px",
                fontWeight: 600,
                color: hoveredNode.is_suspicious ? "#EF4444" : "#10B981",
              }}
            >
              {hoveredNode.is_suspicious ? "⚠️ Suspicious / Flagged Activity" : "✓ Normal Legitimate Account"}
            </div>
          </div>
        )}

        {/* Cytoscape Graph Canvas */}
        {elements.length > 0 && (
          <CytoscapeComponent
            elements={elements}
            layout={layoutConfig}
            stylesheet={cyStylesheet}
            style={{ width: "100%", height: "100%" }}
            cy={handleCyInit}
            wheelSensitivity={0.25}
          />
        )}

        {/* 4. ACCOUNT DETAILS PANEL (When Node Clicked) */}
        {selectedNode && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              width: "360px",
              maxHeight: "618px",
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid #334155",
              backdropFilter: "blur(12px)",
              borderRadius: "14px",
              padding: "18px",
              color: "#F8FAFC",
              zIndex: 20,
              boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                  Account Details
                </div>
                <div style={{ fontSize: "18px", fontWeight: 800, color: "#38BDF8" }}>
                  {selectedNode.account_id}
                </div>
                {Boolean(
                  selectedNode.is_verified_identity &&
                  selectedNode.account_name &&
                  selectedNode.account_name !== "Name not available" &&
                  selectedNode.account_name !== "Unknown"
                ) && (
                  <div style={{ fontSize: "13px", color: "#E2E8F0", fontWeight: 600 }}>
                    Account Holder: {selectedNode.account_name}
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Account Status Badges */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span
                style={{
                  background: selectedNode.is_suspicious ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                  color: selectedNode.is_suspicious ? "#F87171" : "#34D399",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                {selectedNode.is_suspicious ? "SUSPICIOUS ACTIVITY" : "NORMAL ACCOUNT"}
              </span>
              <span
                style={{
                  background: selectedNode.is_verified_identity ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
                  color: selectedNode.is_verified_identity ? "#34D399" : "#94A3B8",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                {selectedNode.is_verified_identity ? "Verified Directory Account" : "Dataset Account (ACC_xxxx)"}
              </span>
              <span
                style={{
                  background: "rgba(56, 189, 248, 0.15)",
                  color: "#38BDF8",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  fontWeight: 600,
                }}
              >
                Trust: {selectedNode.trust_score !== "Unknown" ? `${selectedNode.trust_score}/100` : "Unknown"}
              </span>
            </div>

            {/* Pattern Badges */}
            {selectedNode.patterns && selectedNode.patterns.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {selectedNode.patterns.map((p, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: "rgba(245, 158, 11, 0.2)",
                      color: "#FDE68A",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                    }}
                  >
                    Pattern: {p}
                  </span>
                ))}
              </div>
            )}

            {/* Account Metrics Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                background: "#1E293B",
                padding: "12px",
                borderRadius: "10px",
                fontSize: "12px",
              }}
            >
              <div>
                <div style={{ color: "#94A3B8", fontSize: "11px" }}>Total Outgoing</div>
                <div style={{ fontWeight: 700, color: "#F8FAFC" }}>
                  {selectedNode.out_degree} txs (₹{selectedNode.total_sent?.toLocaleString("en-IN") || 0})
                </div>
              </div>
              <div>
                <div style={{ color: "#94A3B8", fontSize: "11px" }}>Total Incoming</div>
                <div style={{ fontWeight: 700, color: "#F8FAFC" }}>
                  {selectedNode.in_degree} txs (₹{selectedNode.total_received?.toLocaleString("en-IN") || 0})
                </div>
              </div>
              <div>
                <div style={{ color: "#94A3B8", fontSize: "11px" }}>Unique Counterparties</div>
                <div style={{ fontWeight: 700, color: "#38BDF8" }}>
                  {selectedNode.connected_count || 0} accounts
                </div>
              </div>
              <div>
                <div style={{ color: "#94A3B8", fontSize: "11px" }}>Suspicious Txs</div>
                <div style={{ fontWeight: 700, color: selectedNode.suspicious_tx_count > 0 ? "#EF4444" : "#10B981" }}>
                  {selectedNode.suspicious_tx_count || 0} flagged
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <button
                onClick={() => expandAccountHistory(selectedNode.account_id, "Account")}
                disabled={expandingAccountId === selectedNode.account_id}
                style={{
                  flex: 1,
                  background: expandedAccounts.has(selectedNode.account_id) ? "#059669" : "#0284C7",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <FaCompass />{" "}
                {expandingAccountId === selectedNode.account_id
                  ? "Expanding..."
                  : expandedAccounts.has(selectedNode.account_id)
                  ? "History Expanded ✓"
                  : "Explore Connections"}
              </button>
              <button
                onClick={() => handleInvestigateAccount(selectedNode.account_id)}
                style={{
                  flex: 1,
                  background: "#1E293B",
                  color: "#38BDF8",
                  border: "1px solid #334155",
                  padding: "9px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <FaShieldAlt /> Investigate
              </button>
            </div>
          </div>
        )}

        {/* 5. TRANSACTION DETAILS PANEL (When Edge Clicked) */}
        {selectedEdge && (
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              width: "360px",
              maxHeight: "618px",
              background: "rgba(15, 23, 42, 0.96)",
              border: "1px solid #334155",
              backdropFilter: "blur(12px)",
              borderRadius: "14px",
              padding: "18px",
              color: "#F8FAFC",
              zIndex: 20,
              boxShadow: "0 12px 36px rgba(0,0,0,0.6)",
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                  Transaction Flow Details
                </div>
                <div style={{ fontSize: "17px", fontWeight: 800, color: "#38BDF8" }}>
                  {selectedEdge.id}
                </div>
              </div>
              <button
                onClick={() => setSelectedEdge(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#94A3B8",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Transfer Amount and Risk Badge */}
            <div
              style={{
                background:
                  selectedEdge.risk_level === "CRITICAL"
                    ? "rgba(239, 68, 68, 0.2)"
                    : selectedEdge.risk_level === "HIGH"
                    ? "rgba(249, 115, 22, 0.2)"
                    : selectedEdge.risk_level === "MEDIUM"
                    ? "rgba(234, 179, 8, 0.2)"
                    : "rgba(14, 165, 233, 0.2)",
                border: `1px solid ${
                  selectedEdge.risk_level === "CRITICAL"
                    ? "rgba(239, 68, 68, 0.4)"
                    : selectedEdge.risk_level === "HIGH"
                    ? "rgba(249, 115, 22, 0.4)"
                    : selectedEdge.risk_level === "MEDIUM"
                    ? "rgba(234, 179, 8, 0.4)"
                    : "rgba(14, 165, 233, 0.4)"
                }`,
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "11px", color: "#94A3B8" }}>Transfer Value</div>
                  <div style={{ fontSize: "20px", fontWeight: 800, color: "#F8FAFC" }}>
                    {selectedEdge.formatted_amount}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "10px", color: "#94A3B8", textTransform: "uppercase" }}>Predicted Risk</div>
                  <span
                    style={{
                      background:
                        selectedEdge.risk_level === "CRITICAL"
                          ? "#EF4444"
                          : selectedEdge.risk_level === "HIGH"
                          ? "#F97316"
                          : selectedEdge.risk_level === "MEDIUM"
                          ? "#EAB308"
                          : "#0EA5E9",
                      color: selectedEdge.risk_level === "MEDIUM" ? "#0F172A" : "#FFFFFF",
                      padding: "3px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontWeight: 800,
                      display: "inline-block",
                    }}
                  >
                    {selectedEdge.risk_level} ({selectedEdge.risk_score}/100)
                  </span>
                </div>
              </div>

              {/* Ground-Truth Fraud Label Tag */}
              <div
                style={{
                  background: "#0F172A",
                  padding: "6px 10px",
                  borderRadius: "6px",
                  fontSize: "11px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span style={{ color: "#94A3B8" }}>Dataset Ground Truth:</span>
                <span
                  style={{
                    fontWeight: 700,
                    color:
                      selectedEdge.is_fraud === 1
                        ? "#EF4444"
                        : selectedEdge.is_fraud === 0
                        ? "#10B981"
                        : "#94A3B8",
                  }}
                >
                  {selectedEdge.is_fraud === 1
                    ? "⚠️ Confirmed Fraud (is_fraud=1)"
                    : selectedEdge.is_fraud === 0
                    ? "✓ Legitimate (is_fraud=0)"
                    : "⚪ Unlabeled (NULL)"}
                </span>
              </div>
            </div>

            {/* Data Quality Warning if present */}
            {selectedEdge.has_data_quality_issue && (
              <div
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  color: "#FDE68A",
                }}
              >
                ⚠️ {selectedEdge.data_quality_note}
              </div>
            )}

            {/* Sender -> Receiver Flow Box */}
            <div
              style={{
                background: "#1E293B",
                borderRadius: "10px",
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
                fontSize: "12px",
                border: "1px solid #334155",
              }}
            >
              <div>
                <div style={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  SENDER (ORIGIN)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                  <div style={{ color: "#CBD5E1", fontSize: "12px" }}>
                    <span style={{ color: "#94A3B8" }}>Account ID: </span>
                    <strong style={{ color: "#38BDF8" }}>{selectedEdge.source || selectedEdge.sender_id}</strong>
                  </div>
                  {Boolean(
                    selectedEdge.sender_is_verified &&
                    selectedEdge.sender_name &&
                    selectedEdge.sender_name.trim() &&
                    selectedEdge.sender_name !== "Name not available" &&
                    selectedEdge.sender_name !== "Unknown"
                  ) && (
                    <div style={{ color: "#CBD5E1", fontSize: "12px" }}>
                      <span style={{ color: "#94A3B8" }}>Account Holder: </span>
                      <span style={{ fontWeight: 600, color: "#F8FAFC" }}>
                        {selectedEdge.sender_name}
                      </span>
                    </div>
                  )}
                  {/* Expand Sender History Button */}
                  <div style={{ marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() =>
                        expandAccountHistory(selectedEdge.source || selectedEdge.sender_id, "Sender")
                      }
                      disabled={expandingAccountId === (selectedEdge.source || selectedEdge.sender_id)}
                      style={{
                        width: "100%",
                        background: expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id)
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(56, 189, 248, 0.15)",
                        border: `1px solid ${
                          expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id)
                            ? "#10B981"
                            : "#0284C7"
                        }`,
                        color: expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id)
                          ? "#34D399"
                          : "#38BDF8",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FaHistory />
                      {expandingAccountId === (selectedEdge.source || selectedEdge.sender_id)
                        ? "Retrieving Sender Ledger..."
                        : expandedAccounts.has(selectedEdge.source || selectedEdge.sender_id)
                        ? "Sender History (Expanded in Graph ✓)"
                        : "Expand Sender History in Graph"}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#64748B", margin: "2px 0" }}>
                <div style={{ height: "1px", background: "#334155", flex: 1 }} />
                <FaArrowRight
                  style={{
                    color:
                      selectedEdge.risk_level === "CRITICAL"
                        ? "#EF4444"
                        : selectedEdge.risk_level === "HIGH"
                        ? "#F97316"
                        : selectedEdge.risk_level === "MEDIUM"
                        ? "#EAB308"
                        : "#38BDF8",
                  }}
                />
                <div style={{ height: "1px", background: "#334155", flex: 1 }} />
              </div>

              <div>
                <div style={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700, letterSpacing: "0.5px" }}>
                  RECEIVER (BENEFICIARY)
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px", marginTop: "2px" }}>
                  <div style={{ color: "#CBD5E1", fontSize: "12px" }}>
                    <span style={{ color: "#94A3B8" }}>Account ID: </span>
                    <strong style={{ color: "#38BDF8" }}>{selectedEdge.target || selectedEdge.receiver_id}</strong>
                  </div>
                  {Boolean(
                    selectedEdge.receiver_is_verified &&
                    selectedEdge.receiver_name &&
                    selectedEdge.receiver_name.trim() &&
                    selectedEdge.receiver_name !== "Name not available" &&
                    selectedEdge.receiver_name !== "Unknown"
                  ) && (
                    <div style={{ color: "#CBD5E1", fontSize: "12px" }}>
                      <span style={{ color: "#94A3B8" }}>Account Holder: </span>
                      <span style={{ fontWeight: 600, color: "#F8FAFC" }}>
                        {selectedEdge.receiver_name}
                      </span>
                    </div>
                  )}
                  {/* Expand Receiver History Button */}
                  <div style={{ marginTop: "6px" }}>
                    <button
                      type="button"
                      onClick={() =>
                        expandAccountHistory(selectedEdge.target || selectedEdge.receiver_id, "Receiver")
                      }
                      disabled={expandingAccountId === (selectedEdge.target || selectedEdge.receiver_id)}
                      style={{
                        width: "100%",
                        background: expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id)
                          ? "rgba(16, 185, 129, 0.2)"
                          : "rgba(56, 189, 248, 0.15)",
                        border: `1px solid ${
                          expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id)
                            ? "#10B981"
                            : "#0284C7"
                        }`,
                        color: expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id)
                          ? "#34D399"
                          : "#38BDF8",
                        padding: "7px 10px",
                        borderRadius: "6px",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <FaHistory />
                      {expandingAccountId === (selectedEdge.target || selectedEdge.receiver_id)
                        ? "Retrieving Receiver Ledger..."
                        : expandedAccounts.has(selectedEdge.target || selectedEdge.receiver_id)
                        ? "Receiver History (Expanded in Graph ✓)"
                        : "Expand Receiver History in Graph"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Assessment & Factors */}
            <div
              style={{
                background: "#1E293B",
                padding: "12px 14px",
                borderRadius: "10px",
                fontSize: "11px",
                border: "1px solid #334155",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ color: "#94A3B8", fontWeight: 700, letterSpacing: "0.5px", fontSize: "10px" }}>
                RISK SCORING FACTORS (Independent Behavioral Engine):
              </div>

              {selectedEdge.risk_factors && selectedEdge.risk_factors.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  {selectedEdge.risk_factors.map((factor, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: "#0F172A",
                        padding: "8px 10px",
                        borderRadius: "6px",
                        border: "1px solid #334155",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "2px",
                        }}
                      >
                        <span style={{ fontWeight: 700, color: "#F8FAFC" }}>{factor.factor_name}</span>
                        {factor.score_contribution > 0 && (
                          <span
                            style={{
                              background: "rgba(249, 115, 22, 0.2)",
                              color: "#FB923C",
                              padding: "1px 6px",
                              borderRadius: "4px",
                              fontWeight: 700,
                              fontSize: "10px",
                            }}
                          >
                            +{factor.score_contribution} pts
                          </span>
                        )}
                      </div>
                      <div style={{ color: "#94A3B8", fontSize: "10px", marginBottom: "2px" }}>
                        <span style={{ color: "#64748B" }}>Triggered condition: </span>
                        {factor.condition_triggered}
                      </div>
                      <div style={{ color: "#CBD5E1", fontSize: "11px", lineHeight: "1.3" }}>
                        {factor.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "#94A3B8", fontStyle: "italic" }}>
                  No significant risk rules triggered. Score is based on baseline activity.
                </div>
              )}

              {/* Assessment Context Note */}
              {selectedEdge.conclusion_note && (
                <div
                  style={{
                    marginTop: "4px",
                    padding: "8px 10px",
                    background: "rgba(15, 23, 42, 0.8)",
                    borderLeft: `3px solid ${
                      selectedEdge.risk_level === "CRITICAL"
                        ? "#EF4444"
                        : selectedEdge.risk_level === "HIGH"
                        ? "#F97316"
                        : selectedEdge.risk_level === "MEDIUM"
                        ? "#EAB308"
                        : "#0EA5E9"
                    }`,
                    borderRadius: "0 6px 6px 0",
                    color: "#CBD5E1",
                    fontSize: "11px",
                    lineHeight: "1.4",
                  }}
                >
                  <strong style={{ color: "#F8FAFC" }}>Risk Assessment: </strong>
                  {selectedEdge.conclusion_note}
                </div>
              )}
            </div>

            <div style={{ fontSize: "11px", color: "#64748B", display: "flex", justifyContent: "space-between" }}>
              <span>Tx ID: {selectedEdge.id}</span>
              <span>Time: {selectedEdge.timestamp}</span>
            </div>
          </div>
        )}
      </div>

      {/* 6. DEEP ACCOUNT AUDIT MODAL (When clicking "Investigate") */}
      {investigatingAccount && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0F172A",
              border: "1px solid #334155",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "680px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 20px 50px rgba(0,0,0,0.8)",
              padding: "24px",
              color: "#F8FAFC",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                  Account Forensic Investigation
                </div>
                <div style={{ fontSize: "22px", fontWeight: 800, color: "#38BDF8" }}>
                  {investigatingAccount}
                </div>
                {Boolean(
                  accountAuditDetail?.is_verified_identity &&
                  accountAuditDetail?.account_name &&
                  accountAuditDetail?.account_name !== "Name not available" &&
                  accountAuditDetail?.account_name !== "Unknown"
                ) && (
                  <div style={{ fontSize: "14px", color: "#E2E8F0" }}>
                    Account Holder: {accountAuditDetail.account_name}
                    {accountAuditDetail.upi_id && accountAuditDetail.upi_id !== "Not available"
                      ? ` (${accountAuditDetail.upi_id})`
                      : ""}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  setInvestigatingAccount(null);
                  setAccountAuditDetail(null);
                }}
                style={{
                  background: "#1E293B",
                  border: "none",
                  color: "#94A3B8",
                  padding: "8px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {loadingAudit ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#94A3B8" }}>
                Loading ledger records...
              </div>
            ) : accountAuditDetail ? (
              <>
                {/* Metrics Summary */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "10px",
                  }}
                >
                  <div style={{ background: "#1E293B", padding: "12px", borderRadius: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Total Sent</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC" }}>
                      ₹{accountAuditDetail.total_amount_sent?.toLocaleString("en-IN") || 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      {accountAuditDetail.total_outgoing_transactions} transfers
                    </div>
                  </div>
                  <div style={{ background: "#1E293B", padding: "12px", borderRadius: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Total Received</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#10B981" }}>
                      ₹{accountAuditDetail.total_amount_received?.toLocaleString("en-IN") || 0}
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>
                      {accountAuditDetail.total_incoming_transactions} credits
                    </div>
                  </div>
                  <div style={{ background: "#1E293B", padding: "12px", borderRadius: "10px" }}>
                    <div style={{ fontSize: "11px", color: "#94A3B8" }}>Unique Contacts</div>
                    <div style={{ fontSize: "16px", fontWeight: 800, color: "#38BDF8" }}>
                      {accountAuditDetail.unique_connected_accounts_count} accounts
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>Counterparties</div>
                  </div>
                </div>

                {/* Counterparties List */}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#E2E8F0", marginBottom: "8px" }}>
                    Connected Network Counterparties ({accountAuditDetail.counterparties?.length || 0})
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", maxHeight: "100px", overflowY: "auto" }}>
                    {accountAuditDetail.counterparties?.map((cp, idx) => (
                      <span
                        key={idx}
                        onClick={() => {
                          setInvestigatingAccount(null);
                          handleExploreConnections(cp);
                        }}
                        style={{
                          background: "#1E293B",
                          color: "#38BDF8",
                          border: "1px solid #334155",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                        title="Click to explore this counterparty network"
                      >
                        {cp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recent Transactions Table */}
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: "#E2E8F0", marginBottom: "8px" }}>
                    Recent Ledger History ({accountAuditDetail.recent_transactions?.length || 0})
                  </div>
                  <div
                    style={{
                      maxHeight: "220px",
                      overflowY: "auto",
                      border: "1px solid #334155",
                      borderRadius: "10px",
                    }}
                  >
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                      <thead>
                        <tr style={{ background: "#1E293B", color: "#94A3B8", textAlign: "left" }}>
                          <th style={{ padding: "8px 12px" }}>TXN ID</th>
                          <th style={{ padding: "8px 12px" }}>Sender</th>
                          <th style={{ padding: "8px 12px" }}>Receiver</th>
                          <th style={{ padding: "8px 12px" }}>Amount</th>
                          <th style={{ padding: "8px 12px" }}>Fraud Flag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {accountAuditDetail.recent_transactions?.map((t, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderTop: "1px solid #1E293B",
                              background: t.is_fraud ? "rgba(239, 68, 68, 0.1)" : "transparent",
                            }}
                          >
                            <td style={{ padding: "8px 12px", fontFamily: "monospace" }}>{t.transaction_id}</td>
                            <td style={{ padding: "8px 12px" }}>{t.sender_account}</td>
                            <td style={{ padding: "8px 12px" }}>{t.receiver_account}</td>
                            <td style={{ padding: "8px 12px", fontWeight: 700 }}>
                              ₹{t.amount?.toLocaleString("en-IN")}
                            </td>
                            <td style={{ padding: "8px 12px" }}>
                              {t.is_fraud === 1 || t.is_fraud ? (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInvestigatingFraudTxn(t);
                                  }}
                                  title="Click to view fraud evidence and investigation details"
                                  style={{
                                    background: "#EF4444",
                                    color: "#FFFFFF",
                                    border: "1px solid #DC2626",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "11px",
                                    fontWeight: 800,
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                    boxShadow: "0 2px 6px rgba(239, 68, 68, 0.4)",
                                    transition: "all 0.15s ease",
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = "#DC2626")}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = "#EF4444")}
                                >
                                  ⚠️ FRAUD
                                </button>
                              ) : (
                                <span
                                  style={{
                                    background: "#10B981",
                                    color: "#FFFFFF",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontSize: "10px",
                                    fontWeight: 700,
                                    display: "inline-block",
                                  }}
                                >
                                  OK
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* 7. COMPACT FRAUD INVESTIGATION MODAL */}
      {investigatingFraudTxn && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "#0F172A",
              border: "1.5px solid #EF4444",
              borderRadius: "16px",
              width: "100%",
              maxWidth: "540px",
              maxHeight: "85vh",
              overflowY: "auto",
              boxShadow: "0 24px 60px rgba(239, 68, 68, 0.25)",
              padding: "22px 24px",
              color: "#F8FAFC",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "#F87171",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  ⚠️ Fraud Investigation Dossier
                </div>
                <div style={{ fontSize: "20px", fontWeight: 800, color: "#F8FAFC", marginTop: "2px" }}>
                  {investigatingFraudTxn.transaction_id}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setInvestigatingFraudTxn(null)}
                style={{
                  background: "#1E293B",
                  border: "none",
                  color: "#94A3B8",
                  padding: "6px 10px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                }}
              >
                <FaTimes />
              </button>
            </div>

            {/* Core Transaction Parameters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
                background: "#1E293B",
                padding: "12px 14px",
                borderRadius: "10px",
                border: "1px solid #334155",
                fontSize: "12px",
              }}
            >
              <div>
                <div style={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700 }}>TRANSFER AMOUNT</div>
                <div style={{ fontSize: "16px", fontWeight: 800, color: "#F8FAFC" }}>
                  ₹{investigatingFraudTxn.amount?.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div style={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700 }}>TIMESTAMP</div>
                <div style={{ color: "#CBD5E1", fontWeight: 600 }}>{investigatingFraudTxn.timestamp}</div>
              </div>
              <div>
                <div style={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700 }}>SENDER (ORIGIN)</div>
                <div style={{ color: "#38BDF8", fontWeight: 700 }}>{investigatingFraudTxn.sender_account}</div>
                {investigatingFraudTxn.sender_is_verified && investigatingFraudTxn.sender_name && (
                  <div style={{ color: "#E2E8F0", fontSize: "11px" }}>{investigatingFraudTxn.sender_name}</div>
                )}
              </div>
              <div>
                <div style={{ color: "#94A3B8", fontSize: "10px", fontWeight: 700 }}>RECEIVER (BENEFICIARY)</div>
                <div style={{ color: "#38BDF8", fontWeight: 700 }}>{investigatingFraudTxn.receiver_account}</div>
                {investigatingFraudTxn.receiver_is_verified && investigatingFraudTxn.receiver_name && (
                  <div style={{ color: "#E2E8F0", fontSize: "11px" }}>{investigatingFraudTxn.receiver_name}</div>
                )}
              </div>
            </div>

            {/* Ground Truth vs Model Prediction (Separation of Truth & Predictions) */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                borderRadius: "10px",
                padding: "12px 14px",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#FCA5A5", fontWeight: 700, textTransform: "uppercase" }}>
                  Dataset Ground Truth:
                </span>
                <span
                  style={{
                    background: "#EF4444",
                    color: "#FFFFFF",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  CONFIRMED FRAUD (is_fraud = 1)
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 700, textTransform: "uppercase" }}>
                  Behavioral Model Prediction:
                </span>
                <span
                  style={{
                    background:
                      investigatingFraudTxn.risk_level === "CRITICAL"
                        ? "#EF4444"
                        : investigatingFraudTxn.risk_level === "HIGH"
                        ? "#F97316"
                        : investigatingFraudTxn.risk_level === "MEDIUM"
                        ? "#EAB308"
                        : "#0EA5E9",
                    color: investigatingFraudTxn.risk_level === "MEDIUM" ? "#0F172A" : "#FFFFFF",
                    padding: "3px 8px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 800,
                  }}
                >
                  {investigatingFraudTxn.risk_level || "EVALUATED"} ({investigatingFraudTxn.risk_score || 0}/100)
                </span>
              </div>
            </div>

            {/* Actual Evidence / Triggered Rules */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  fontSize: "11px",
                  color: "#94A3B8",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Actual Detection Evidence & Rules Triggered:
              </div>

              {investigatingFraudTxn.risk_factors && investigatingFraudTxn.risk_factors.length > 0 ? (
                investigatingFraudTxn.risk_factors.map((factor, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: "#1E293B",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      border: "1px solid #334155",
                      fontSize: "11px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                      <strong style={{ color: "#F8FAFC" }}>{factor.factor_name}</strong>
                      {factor.score_contribution > 0 && (
                        <span style={{ color: "#FB923C", fontWeight: 700 }}>+{factor.score_contribution} pts</span>
                      )}
                    </div>
                    <div style={{ color: "#94A3B8", fontSize: "10px" }}>{factor.condition_triggered}</div>
                    <div style={{ color: "#CBD5E1", marginTop: "2px" }}>{factor.explanation}</div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    background: "#1E293B",
                    padding: "10px 12px",
                    borderRadius: "8px",
                    color: "#94A3B8",
                    fontSize: "11px",
                    fontStyle: "italic",
                    border: "1px solid #334155",
                  }}
                >
                  Fraud-labelled in the dataset; no specific reason is available in the current data.
                </div>
              )}

              {/* Supporting Network Patterns if any */}
              {investigatingFraudTxn.patterns && investigatingFraudTxn.patterns.length > 0 && (
                <div style={{ marginTop: "4px" }}>
                  <div
                    style={{
                      fontSize: "10px",
                      color: "#94A3B8",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      marginBottom: "4px",
                    }}
                  >
                    Network Relationship Evidence:
                  </div>
                  <ul style={{ margin: 0, paddingLeft: "18px", fontSize: "11px", color: "#FDE68A" }}>
                    {investigatingFraudTxn.patterns.map((p, idx) => (
                      <li key={idx}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: "flex", gap: "10px", marginTop: "4px" }}>
              <button
                type="button"
                onClick={() => {
                  const targetId = investigatingFraudTxn.transaction_id;
                  setInvestigatingFraudTxn(null);
                  setInvestigatingAccount(null);
                  setAccountAuditDetail(null);
                  loadTargetTransaction(targetId);
                }}
                style={{
                  flex: 1,
                  background: "#0284C7",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                }}
              >
                <FaProjectDiagram /> View in Network Graph
              </button>
              <button
                type="button"
                onClick={() => setInvestigatingFraudTxn(null)}
                style={{
                  background: "#1E293B",
                  color: "#94A3B8",
                  border: "1px solid #334155",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionGraph;
