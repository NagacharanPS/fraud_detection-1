# UPI PayGuard - AI-Based UPI Fraud Detection & Prevention System

An enterprise-grade real-time UPI Fraud Detection & Prevention System powered by Extra Trees Machine Learning, biometric face attestation, SMS OTP multi-factor step-up verification, graph analytics, and behavioral risk scoring.

---

## 📁 Project Architecture Overview

This project uses a modern **Unified Full-Stack Architecture**:

- **`src/`** ➡️ **React 18 Frontend Application** (Vite + Tailwind CSS + Lucide / React Icons)
  - `src/components/`: PaymentForm, DeviceSecurityModal (Biometrics & SMS OTP), Navbar, AccountSelector, etc.
  - `src/context/AuthContext.jsx`: User Authentication, session management, and persona switching.
  - `src/pages/`: Dashboard, Analytics, Live Fraud Feed, Audit Logs, Settings.
- **`server.ts`** ➡️ **Full-Stack Express + Vite Integration Server**
  - Serves API routes (`/api/auth/*`, `/api/transfer/*`, `/api/payment/*`, `/api/dashboard/*`).
  - Contains in-memory / relational data storage for users, accounts, biometric embeddings, and audit logs.
  - Integrates directly with Python ML model inference (`backend/ml/predict.py`).
  - Seamlessly serves the React frontend via Vite middleware.
- **`backend/`** ➡️ **Python ML Engine & Data Science Models**
  - `backend/ml/`: Extra Trees classifier, feature encoders, risk predictors.
  - `backend/data/`: Account datasets and historical transactions.
- **`package.json` & `vite.config.js`** ➡️ Root build and runtime configurations.

> **Note on Folder Structure**: In this unified setup, the frontend source code is located in the root **`src/`** directory (not a nested `frontend/` folder), allowing both the backend API and frontend React client to run seamlessly on a single port (**`http://localhost:3000`**).

---

## 🚀 How to Run in Local VS Code (Quick Start)

### 1. Prerequisites
- **Node.js** (v18 or higher) - [Download Node.js](https://nodejs.org/)
- **Python** (v3.9 or higher) - [Download Python](https://python.org/)

---

### 2. Extract & Open in VS Code
1. Extract the downloaded `upi_payguard_project.zip` file.
2. Open VS Code and open the extracted project root folder (where `package.json` and `server.ts` are visible in the root).

---

### 3. Install Dependencies

Open the integrated terminal in VS Code (`Ctrl + ~` or `Terminal -> New Terminal`):

#### A. Install Node.js Packages:
```bash
npm install
```

#### B. (Optional) Install Python ML Requirements:
```bash
pip install -r requirements.txt
```

---

### 4. Start the Application

In the VS Code terminal, run:

```bash
npm run dev
```

Open your browser and navigate to:
👉 **`http://localhost:3000`**

The complete app with user authentication, live payments, biometric face verification, and fraud scoring will load immediately.

---

## 🛠️ Available Scripts

- `npm run dev`: Starts the local Express + Vite dev server at `http://localhost:3000`.
- `npm run build`: Compiles production assets into `dist/`.
- `npm start`: Runs the production server from `dist/`.
