import axios from "axios";

// Get API base URL with fallback for production
// Using type assertion to access Vite environment variables
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE || "https://qcuenjh6mj.us-east-1.awsapprunner.com";

// Log API base URL for debugging (helpful in production)
console.log("🔗 API Base URL:", API_BASE_URL);

export const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("session_token");
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
