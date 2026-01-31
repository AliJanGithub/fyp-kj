import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { WalletProvider, useWallet } from "./context/WalletContext";
import Navbar from "./components/Navbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import "./App.css";

const ProtectedRoute = ({ children }) => {
  const { account, loading } = useWallet();

  // If we are still loading (checking login), don't redirect yet
  if (loading) return <div className="loading-screen">Verifying Session...</div>;

  // If no account is found after loading/rehydration, then redirect
  if (!account) return <Navigate to="/login" />;

  return children;
};

function App() {
  return (
    <WalletProvider>
      <Router>
        <div className="app-container">
          <Navbar />
          <main className="main-content">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/upload"
                element={
                  <ProtectedRoute>
                    <Upload />
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" />} />
            </Routes>
          </main>
          <ToastContainer position="bottom-right" theme="dark" />
        </div>
      </Router>
    </WalletProvider>
  );
}

export default App;
