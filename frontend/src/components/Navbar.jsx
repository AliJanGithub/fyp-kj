import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useWallet } from "../context/WalletContext";
import "./Navbar.css";

const Navbar = () => {
    const { account, user, connectWallet, disconnectWallet } = useWallet();
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <div className="nav-logo" onClick={() => navigate("/")}>
                Drive<span>Chain</span>
            </div>
            <div className="nav-links">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/upload">Upload</Link>
                {account ? (
                    <div className="wallet-info">
                        <span className="user-displayName">{user?.username || account.substring(0, 6)}</span>
                        <span className="address separator">|</span>
                        <span className="address">{account.substring(38)}</span>
                        <button className="btn-disconnect" onClick={disconnectWallet}>Logout</button>
                    </div>
                ) : (
                    <button className="btn-connect" onClick={connectWallet}>Login</button>
                )}
            </div>
        </nav>
    );
};

export default Navbar;
