import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "../api/axios";
import { User } from "../types";

interface AuthContextType {
    user: User | null;
    isLoading: boolean;
    login: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [sessionToken, setSessionToken] = useState(localStorage.getItem("session_token"));

    useEffect(() => {
        // Extract token from URL if present (OAuth callback)
        const params = new URLSearchParams(window.location.search);
        const token = params.get("token");

        if (token) {
            localStorage.setItem("session_token", token);
            setSessionToken(token);
            window.history.replaceState({}, document.title, "/");
        }
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            if (!sessionToken) {
                setIsLoading(false);
                return;
            }

            try {
                const res = await api.get(`/auth/status`, {
                    headers: { Authorization: `Bearer ${sessionToken}` }
                });

                if (res.data.authenticated) {
                    setUser(res.data.user);
                } else {
                    localStorage.removeItem("session_token");
                    setSessionToken(null);
                    setUser(null);
                }
            } catch (err) {
                console.error("Auth check failed:", err);
                localStorage.removeItem("session_token");
                setSessionToken(null);
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, [sessionToken]);

    const login = async () => {
        try {
            // Backend returns a 307 redirect directly to Google OAuth
            // So we navigate to the backend endpoint which will redirect us
            const API_BASE = (import.meta as any).env?.VITE_API_BASE || "https://qcuenjh6mj.us-east-1.awsapprunner.com";
            window.location.href = `${API_BASE}/auth/google/login`;
        } catch (err) {
            console.error("Login failed:", err);
            alert("Failed to initiate Google login");
        }
    };

    const logout = async () => {
        try {
            await api.post(`/auth/logout`);
        } catch (err) {
            console.error("Logout failed:", err);
        } finally {
            localStorage.removeItem("session_token");
            setSessionToken(null);
            setUser(null);
        }
    };

    return (
        <AuthContext.Provider value={{ user, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
