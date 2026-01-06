import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// Context
import { AuthProvider, useAuth } from "./context/AuthContext";

// Pages
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ErrorBoundary from "./components/shared/ErrorBoundary";
import Background3D from "./components/shared/Background3D";

function AppContent() {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
                <ErrorBoundary fallback={<div className="fixed inset-0 -z-10 bg-gray-900" />}>
                    <Background3D />
                </ErrorBoundary>
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="glass-panel p-8 text-center"
                >
                    <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin" />
                    <p className="text-gray-400 mt-4">Checking authentication...</p>
                </motion.div>
            </div>
        );
    }

    return user ? <Dashboard /> : <Login />;
}

export default function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
}
