import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "react-toastify";
import axios from "axios";
import { useWallet } from "../context/WalletContext";
import "./Upload.css";

const Upload = () => {
    const { account, token } = useWallet();
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [results, setResults] = useState(null);
    const [summary, setSummary] = useState(null);

    const onDrop = useCallback((acceptedFiles) => {
        const selectedFile = acceptedFiles[0];
        if (selectedFile && selectedFile.type.startsWith("video/")) {
            setFile(selectedFile);
            setResults(null);
            setSummary(null);
        } else {
            toast.error("Please select a valid video file.");
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        multiple: false,
        accept: { "video/*": [] }
    });

    const handleUpload = async () => {
        if (!file) return;
        if (!token) {
            toast.error("Authentication required. Please reconnect wallet.");
            return;
        }
        setUploading(true);
        setProgress(0);

        const formData = new FormData();
        formData.append("video", file);

        try {
            const response = await axios.post("http://localhost:5000/api/video/upload", formData, {
                headers: {
                    Authorization: `Bearer ${token}`
                },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setProgress(percentCompleted);
                }
            });

            toast.success("Analysis complete!");
            setResults(response.data.violations || []);
            setSummary({
                penaltyCount: response.data.penaltyCount,
                deductionAmount: response.data.deductionAmount
            });
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.error || "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="upload-container">
            <h1 className="page-title">Evidence <span>Upload</span></h1>

            <div className="upload-grid">
                <div className="glass-card upload-section">
                    <div {...getRootProps()} className={`dropzone ${isDragActive ? "active" : ""} ${file ? "has-file" : ""}`}>
                        <input {...getInputProps()} />
                        {file ? (
                            <div className="file-info">
                                <span className="file-icon">📹</span>
                                <span className="file-name">{file.name}</span>
                                <span className="file-size">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                            </div>
                        ) : (
                            <div className="drop-message">
                                <span className="drop-icon">📤</span>
                                <p>{isDragActive ? "Drop the video here" : "Drag & drop driving video here, or click to select"}</p>
                                <span className="file-hint">MP4, MOV, AVI up to 50MB</span>
                            </div>
                        )}
                    </div>

                    {file && !uploading && !results && (
                        <button className="btn-primary upload-btn" onClick={handleUpload}>
                            Start AI Analysis
                        </button>
                    )}

                    {uploading && (
                        <div className="progress-container">
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                            <span className="progress-text">{progress}% Uploaded...</span>
                        </div>
                    )}
                </div>

                <div className="glass-card results-section">
                    <h3>Analysis Results</h3>
                    {results ? (
                        <div className="analysis-container">
                            {summary && summary.penaltyCount > 0 && (
                                <div className="analysis-summary">
                                    <p>Detected <strong>{summary.penaltyCount}</strong> violations.</p>
                                    <p className="deduction-total">Total Deduction: <span>{summary.deductionAmount}</span></p>
                                </div>
                            )}
                            <div className="violations-list">
                                {results.length > 0 ? (
                                    results.map((v, i) => (
                                        <div key={i} className="violation-item">
                                            <span className="v-time">{v.timestamp}</span>
                                            <span className="v-desc">{v.description}</span>
                                            <span className="v-penalty">-0.1 ETH</span>
                                        </div>
                                    ))
                                ) : (
                                    <div className="success-message">
                                        ✅ No violations detected! Reward granted: 0.1 ETH
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-results">
                            Upload a video to see AI-detected violations here.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Upload;
