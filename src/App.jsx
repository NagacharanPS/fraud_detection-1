import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import PaymentProcessing from "./pages/PaymentProcessing";
import PaymentSuccess from "./pages/PaymentSuccess";

function MainLayout() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F5F7FB",
      }}
    >
      <Navbar />

      <div
        style={{
          maxWidth: "750px",
          margin: "0 auto",
          padding: "24px 20px 60px",
        }}
      >
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* AI Processing */}
          <Route
            path="/processing"
            element={<PaymentProcessing />}
          />

          {/* Success */}
          <Route
            path="/payment-success"
            element={<PaymentSuccess />}
          />

          {/* Main Layout & Auth Routes */}
          <Route path="/*" element={<MainLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;

