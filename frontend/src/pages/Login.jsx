import React from "react";
import { useWallet } from "../context/WalletContext";
import { Navigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
    const { account, connectWallet, loading } = useWallet();

    if (account) return <Navigate to="/dashboard" />;

    return (
        <div className="login-container">
            <div className="glass-card login-card">
                <h1 className="hero-title">Welcome to <span>DriveChain</span></h1>
                <p className="hero-subtitle">
                    Secure your driving record on the blockchain. Upload videos,
                    detect violations, and manage your stake transparently.
                </p>
                <button
                    className="btn-primary login-btn"
                    onClick={connectWallet}
                    disabled={loading}
                >
                    {loading ? "Connecting..." : "Connect MetaMask to Start"}
                </button>
                <div className="features-grid">
                    <div className="feature-item">
                        <span className="icon">🛡️</span>
                        <h3>Tamper-proof</h3>
                        <p>Your driving violations are recorded on-chain.</p>
                    </div>
                    <div className="feature-item">
                        <span className="icon">🤖</span>
                        <h3>AI Analysis</h3>
                        <p>Automated detection of speeding and traffic light violations.</p>
                    </div>
                    <div className="feature-item">
                        <span className="icon">💰</span>
                        <h3>Fair Penalties</h3>
                        <p>Blockchain formulas ensure transparency in fines.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
