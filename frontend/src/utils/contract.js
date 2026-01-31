import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "./constants";

export const getContract = async () => {
    if (!window.ethereum) throw new Error("No crypto wallet found. Please install MetaMask.");
    if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === "YOUR_CONTRACT_ADDRESS_HERE") {
        console.warn("Contract address not set. Blockchain interaction disabled.");
        return null;
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    return contract;
};

export const formatEther = (value) => ethers.formatEther(value);
export const parseEther = (value) => ethers.parseEther(value);
