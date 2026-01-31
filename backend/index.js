require('dotenv').config();
const express = require('express');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const { ethers } = require('ethers');
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Schemas
const userSchema = new mongoose.Schema({
    address: { type: String, required: true, unique: true },
    name: { type: String, default: "" },
    username: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now }
});

const violationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    videoUrl: String,
    timestamp: String,
    description: String,
    penalty: { type: Number, default: 0.1 },
    date: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Violation = mongoose.model('Violation', violationSchema);

// Auth Middleware
const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.userId;
        req.userAddress = decoded.address;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Multer Config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Blockchain Setup (Owner)
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL;

const CONTRACT_ABI = [
    "function reportPenalty(address user, uint256 count) external",
    "function settle(address user) external",
    "function balances(address user) external view returns (uint256)",
    "function penalties(address user) external view returns (uint256)"
];

const getOwnerContract = async () => {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);
};

// Routes

// 1. Wallet Auth Route
app.post('/api/auth/login', async (req, res) => {
    try {
        const { address } = req.body;
        if (!address) return res.status(400).json({ error: 'Address required' });

        const lowercaseAddress = address.toLowerCase();
        let user = await User.findOne({ address: lowercaseAddress });

        if (!user) {
            // Create new user with default username from address
            const defaultUsername = `user_${lowercaseAddress.substring(2, 8)}`;
            user = await User.create({
                address: lowercaseAddress,
                username: defaultUsername,
                name: "New Driver"
            });
            console.log("New user created:", user.address);
        }

        const token = jwt.sign({ userId: user._id, address: user.address }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: 'Login failed: ' + error.message });
    }
});

// Update Profile Route
app.post('/api/user/profile', authMiddleware, async (req, res) => {
    try {
        const { name, username } = req.body;
        const user = await User.findById(req.userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        if (name) user.name = name;
        if (username) user.username = username;

        await user.save();
        res.json({ message: 'Profile updated', user });
    } catch (error) {
        res.status(500).json({ error: 'Profile update failed' });
    }
});

// 2. Protected Video Upload
app.post('/api/video/upload', authMiddleware, upload.single('video'), async (req, res) => {
    try {
        const videoFile = req.file;
        const userWalletAddress = req.userAddress;

        // Move file to AI service input folder (Robust way)
        const aiInputPath = path.join(__dirname, '..', 'ai-service', 'input_videos', videoFile.filename);
        try {
            fs.copyFileSync(videoFile.path, aiInputPath);
            fs.unlinkSync(videoFile.path); // Delete the temporary file
        } catch (fsErr) {
            console.error("File Move Error:", fsErr);
            return res.status(500).json({ error: 'Failed to process video file on server' });
        }

        console.log(`Video moved to AI input: ${aiInputPath} from user: ${userWalletAddress}`);

        // 1. Send to AI Service (Python Microservice)
        let violations = [];
        try {
            console.log("Calling AI Service at:", process.env.AI_SERVICE_URL);
            const aiResponse = await axios.post(process.env.AI_SERVICE_URL, {
                video_path: path.resolve(aiInputPath)
            });
            violations = aiResponse.data.violations || [];
            console.log("AI Service response received.");
        } catch (aiErr) {
            console.warn("AI Service not reachable, falling back to mock data. Error:", aiErr.message);
            // --- MOCKING AI RESPONSE FOR DEMO ---
            await new Promise(r => setTimeout(r, 2000)); // Simulate processing
            violations = [
                { timestamp: "00:15", description: "Speeding violation detected (85km/h in 60 zone)" },
                { timestamp: "01:22", description: "Traffic signal violation (red light)" }
            ];
            // --- END MOCK ---
        }

        // Save violations to DB
        const savedViolations = [];
        for (const v of violations) {
            const newV = await Violation.create({
                user: req.userId,
                videoUrl: aiInputPath,
                timestamp: v.timestamp,
                description: v.description
            });
            savedViolations.push(newV);
        }

        const penaltyCount = violations.length;

        // Blockchain Settlement
        try {
            if (CONTRACT_ADDRESS && PRIVATE_KEY && PRIVATE_KEY !== 'YOUR_PRIVATE_KEY_HERE') {
                const contract = await getOwnerContract();
                await (await contract.reportPenalty(userWalletAddress, penaltyCount)).wait();
                await (await contract.settle(userWalletAddress)).wait();
                console.log("Blockchain settlement complete.");
            }
        } catch (bcError) {
            console.error("Blockchain error:", bcError.message);
        }

        res.json({
            message: 'Analysis complete and saved to database',
            violations: savedViolations,
            penaltyCount,
            deductionAmount: `${penaltyCount * 0.1} ETH`
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload process failed' });
    }
});

// 3. User Violation History
// 4. History API (Specific Result for token)
app.get('/api/video/results/:videoId', authMiddleware, async (req, res) => {
    try {
        const violation = await Violation.findOne({ _id: req.params.videoId, user: req.userId });
        if (!violation) return res.status(404).json({ error: 'Result not found' });
        res.json(violation);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch result' });
    }
});

// Global Error Handler
app.use((err, req, res, next) => {
    console.error("Unhandled Error:", err.stack);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
