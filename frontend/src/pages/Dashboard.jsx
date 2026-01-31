import React, { useState, useEffect } from "react";
import { useWallet } from "../context/WalletContext";
import { getContract, formatEther, parseEther } from "../utils/contract";
import { toast } from "react-toastify";
import axios from "axios";
import "./Dashboard.css";

const Dashboard = () => {
    const { account, token, user, setUser } = useWallet();
    const [balance, setBalance] = useState("0");
    const [pendingPenalties, setPendingPenalties] = useState("0");
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [depositAmount, setDepositAmount] = useState("");

    const [name, setName] = useState(user?.name || "");
    const [username, setUsername] = useState(user?.username || "");
    const [isEditing, setIsEditing] = useState(false);

    const fetchBlockchainData = async () => {
        if (!account) return;
        try {
            const contract = await getContract();
            if (!contract) return; // Silent return if contract is not deployed
            const bal = await contract.balances(account);
            const pen = await contract.penalties(account);
            setBalance(formatEther(bal));
            setPendingPenalties(pen.toString());
        } catch (error) {
            console.error("Error fetching blockchain data:", error);
        }
    };

    const fetchHistory = async () => {
        if (!token) return;
        try {
            const response = await axios.get("http://localhost:5000/api/user/history", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setHistory(response.data);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    useEffect(() => {
        fetchBlockchainData();
        fetchHistory();
    }, [account, token]);

    const handleDeposit = async (e) => {
        e.preventDefault();
        if (!depositAmount || isNaN(depositAmount)) return;
        setLoading(true);
        try {
            const contract = await getContract();
            const tx = await contract.deposit({ value: parseEther(depositAmount) });
            toast.info("Transaction submitted...");
            await tx.wait();
            toast.success("Deposit successful!");
            setDepositAmount("");
            fetchBlockchainData();
        } catch (error) {
            console.error(error);
            toast.error("Deposit failed.");
        } finally {
            setLoading(false);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post("http://localhost:5000/api/user/profile",
                { name, username },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUser(response.data.user);
            localStorage.setItem("user", JSON.stringify(response.data.user));
            setIsEditing(false);
            toast.success("Profile updated!");
        } catch (error) {
            toast.error("Profile update failed.");
        }
    };

    return (
        <div className="dashboard-container">
            <div className="profile-header glass-card">
                <div className="profile-info">
                    <div className="avatar">👤</div>
                    {isEditing ? (
                        <form className="profile-edit-form" onSubmit={handleProfileUpdate}>
                            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" />
                            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
                            <div className="edit-actions">
                                <button type="submit" className="btn-primary mini">Save</button>
                                <button type="button" className="btn-secondary mini" onClick={() => setIsEditing(false)}>Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div className="profile-text">
                            <h2>{user?.name || "Guest User"}</h2>
                            <p>@{user?.username || "unknown"}</p>
                            <button className="btn-edit-link" onClick={() => setIsEditing(true)}>Edit Profile</button>
                        </div>
                    )}
                </div>
                <div className="wallet-badge">
                    <span>Connected Wallet:</span>
                    <strong>{account?.substring(0, 10)}...</strong>
                </div>
            </div>

            <h1 className="page-title">DriveChain <span>Stats</span></h1>

            <div className="dashboard-grid">
                <div className="glass-card stat-card">
                    <div className="stat-icon">💰</div>
                    <div className="stat-content">
                        <span className="stat-label">Staked Balance</span>
                        <span className="stat-value">{balance} ETH</span>
                    </div>
                    <form className="deposit-form" onSubmit={handleDeposit}>
                        <input
                            type="text"
                            placeholder="Amount in ETH"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                        />
                        <button type="submit" className="btn-primary" disabled={loading || !depositAmount}>
                            {loading ? "Processing..." : "Deposit"}
                        </button>
                    </form>
                </div>

                <div className="glass-card stat-card">
                    <div className="stat-icon">⚠️</div>
                    <div className="stat-content">
                        <span className="stat-label">Pending Violations</span>
                        <span className="stat-value">{pendingPenalties}</span>
                    </div>
                    <p className="stat-hint">Each violation costs 0.1 ETH</p>
                    <button className="btn-primary outline" onClick={() => toast.info("Settlement is automated after video analysis.")}>
                        Settle Now
                    </button>
                </div>
            </div>

            <div className="glass-card history-section">
                <h3>Violation History</h3>
                {history.length > 0 ? (
                    <div className="history-list">
                        {history.map((v, i) => (
                            <div key={i} className="history-item">
                                <div className="history-main">
                                    <span className="h-desc">{v.description}</span>
                                    <span className="h-date">{new Date(v.date).toLocaleDateString()}</span>
                                </div>
                                <div className="history-meta">
                                    <span className="h-time">{v.timestamp}</span>
                                    <span className="h-penalty">-0.1 ETH</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="empty-state">
                        No violation history found. Start by uploading a driving video.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
