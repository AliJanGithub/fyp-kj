import React, { createContext, useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-toastify";
import axios from "axios";

const WalletContext = createContext();

export const useWallet = () => useContext(WalletContext);

export const WalletProvider = ({ children }) => {
    const [account, setAccount] = useState(localStorage.getItem("account"));
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [user, setUser] = useState(JSON.parse(localStorage.getItem("user") || "null"));
    const [loading, setLoading] = useState(!!localStorage.getItem("account"));

    const loginWithBackend = async (address) => {
        try {
            const response = await axios.post("http://localhost:5000/api/auth/login", { address });
            const { token: receivedToken, user: receivedUser } = response.data;
            setToken(receivedToken);
            setUser(receivedUser);
            localStorage.setItem("token", receivedToken);
            localStorage.setItem("user", JSON.stringify(receivedUser));
            localStorage.setItem("account", address);
            return receivedToken;
        } catch (err) {
            console.error("Backend login failed:", err);
            toast.error("Backend authentication failed.");
            return null;
        }
    };

    const connectWallet = async () => {
        if (!window.ethereum) {
            toast.error("MetaMask not found!");
            return;
        }
        setLoading(true);
        try {
            const provider = new ethers.BrowserProvider(window.ethereum);
            const accounts = await provider.send("eth_requestAccounts", []);
            const address = accounts[0];

            setAccount(address);
            localStorage.setItem("account", address);
            await loginWithBackend(address);

            toast.success("Wallet connected & Authenticated!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to connect wallet.");
        } finally {
            setLoading(false);
        }
    };

    const disconnectWallet = () => {
        setAccount(null);
        setToken(null);
        setUser(null);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        localStorage.removeItem("account");
        toast.info("Logged out.");
    };

    useEffect(() => {
        const checkConnection = async () => {
            if (window.ethereum && account) {
                try {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const accounts = await provider.listAccounts();
                    if (accounts.length === 0) {
                        // Not really connected to MetaMask anymore
                        // disconnectWallet();
                    }
                } catch (e) {
                    console.error("Connection check failed", e);
                }
            }
            setLoading(false);
        };
        checkConnection();

        if (window.ethereum) {
            window.ethereum.on("accountsChanged", (accounts) => {
                if (accounts.length > 0) {
                    const newAcc = accounts[0].toLowerCase();
                    setAccount(newAcc);
                    localStorage.setItem("account", newAcc);
                    loginWithBackend(newAcc);
                } else {
                    disconnectWallet();
                }
            });
        }
    }, []); // Only run once on mount

    return (
        <WalletContext.Provider value={{ account, token, user, setUser, connectWallet, disconnectWallet, loading }}>
            {children}
        </WalletContext.Provider>
    );
};
