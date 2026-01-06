import { motion, useScroll, useTransform } from "framer-motion";
import { Sparkles, Calendar, MessageSquare, Users, FileText, Mic, Search, Zap, Shield, Brain } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import Background3D from "../components/shared/Background3D";
import ErrorBoundary from "../components/shared/ErrorBoundary";
import { useState } from "react";

// Floating orbs for ambient animation
const FloatingOrb = ({ delay = 0, duration = 20, color = "primary" }: { delay?: number, duration?: number, color?: string }) => (
    <motion.div
        className={`absolute rounded-full blur-3xl opacity-20`}
        style={{
            width: Math.random() * 300 + 200,
            height: Math.random() * 300 + 200,
            background: color === "primary" ? "radial-gradient(circle, #3b82f6 0%, transparent 70%)" : "radial-gradient(circle, #f59e0b 0%, transparent 70%)",
        }}
        animate={{
            x: [Math.random() * 100 - 50, Math.random() * 100 - 50],
            y: [Math.random() * 100 - 50, Math.random() * 100 - 50],
            scale: [1, 1.2, 1],
        }}
        transition={{
            duration,
            repeat: Infinity,
            delay,
            ease: "easeInOut",
        }}
    />
);

// Bento box features with different sizes
const bentoFeatures = [
    {
        icon: Brain,
        title: "RAG Intelligence",
        description: "Vector embeddings for lightning-fast semantic search across all your documents.",
        gradient: "from-blue-500 via-purple-500 to-pink-500",
        size: "large",
        stat: "Semantic",
        delay: 0.1
    },
    {
        icon: Users,
        title: "Smart Contacts",
        description: "Import from LinkedIn CSV/XLSX and VCF files with intelligent matching.",
        gradient: "from-purple-500 to-pink-600",
        size: "medium",
        stat: "Auto-Match",
        delay: 0.2
    },
    {
        icon: MessageSquare,
        title: "AI Chat",
        description: "Context-aware conversations with multi-model LLM support.",
        gradient: "from-cyan-500 to-blue-600",
        size: "medium",
        stat: "Real-time",
        delay: 0.3
    },
    {
        icon: FileText,
        title: "Document Intel",
        description: "Process PDFs, DOCX, XLSX, images, and more with OCR capabilities.",
        gradient: "from-orange-500 to-red-600",
        size: "large",
        stat: "10+ Formats",
        delay: 0.4
    },
    {
        icon: Calendar,
        title: "Calendar Sync",
        description: "Google Calendar integration with AI-powered scheduling automation.",
        gradient: "from-green-500 to-teal-600",
        size: "small",
        stat: "Auto-Book",
        delay: 0.5
    },
    {
        icon: Mic,
        title: "Voice Processing",
        description: "Upload and transcribe voice recordings with AI analysis.",
        gradient: "from-rose-500 to-pink-600",
        size: "small",
        delay: 0.6
    },
];

export default function Login() {
    const { login } = useAuth();
    const [hoveredFeature, setHoveredFeature] = useState<number | null>(null);
    const { scrollY } = useScroll();
    const y1 = useTransform(scrollY, [0, 300], [0, 100]);
    const y2 = useTransform(scrollY, [0, 300], [0, -50]);
    const opacity = useTransform(scrollY, [0, 200], [1, 0.5]);

    return (
        <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
            <ErrorBoundary fallback={<div className="fixed inset-0 -z-10 bg-darkBg" />}>
                <Background3D />
            </ErrorBoundary>

            {/* Animated Mesh Gradient Background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <FloatingOrb delay={0} duration={25} color="primary" />
                <FloatingOrb delay={2} duration={30} color="accent" />
                <FloatingOrb delay={4} duration={20} color="primary" />

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(59,130,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

                {/* Radial Gradient Overlay */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(251,146,60,0.1),transparent_50%)]" />
            </div>

            {/* Main Content */}
            <div className="relative z-10 overflow-y-auto h-screen custom-scrollbar">
                <div className="max-w-7xl mx-auto px-4 py-8 md:py-16">

                    {/* Hero Section */}
                    <motion.div
                        style={{ opacity }}
                        className="text-center mb-20 relative"
                    >
                        {/* Main Title with 3D effect */}
                        <motion.h1
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-7xl md:text-8xl lg:text-9xl font-black mb-6 relative"
                        >
                            <span className="bg-clip-text text-transparent bg-gradient-to-br from-white via-blue-100 to-blue-300 drop-shadow-[0_0_50px_rgba(59,130,246,0.5)]">
                                AI Secretary
                            </span>
                        </motion.h1>

                        {/* Subtitle with animated gradient */}
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.4 }}
                            className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed"
                        >
                            Enterprise-grade AI assistant with{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 font-semibold">
                                RAG-powered intelligence
                            </span>,{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500 font-semibold">
                                semantic search
                            </span>, and{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-orange-500 font-semibold">
                                calendar automation
                            </span>.
                        </motion.p>

                        {/* Primary CTA with advanced effects */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.6, delay: 0.6 }}
                            className="flex flex-col items-center gap-4"
                        >
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={login}
                                className="group relative overflow-hidden bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 p-[2px] rounded-2xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300"
                            >
                                <div className="relative bg-slate-900 hover:bg-slate-900/50 px-12 py-5 rounded-2xl flex items-center gap-4 transition-all duration-300">
                                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-7 h-7" />
                                    <span className="text-xl font-bold text-white">Continue with Google</span>
                                    <Zap className="w-6 h-6 text-amber-400" />
                                </div>
                            </motion.button>

                            {/* Security Badge */}
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <div className="flex items-center gap-2 text-gray-400 text-sm">
                                    <Shield className="w-4 h-4 text-green-400" />
                                    <span>Enterprise-grade Security with OAuth 2.0</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Bento Grid Features */}
                    <motion.div
                        style={{ y: y1 }}
                        className="mb-20"
                    >
                        <motion.h2
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            className="text-5xl font-bold text-center mb-16 text-white"
                        >
                            Built with{" "}
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
                                Cutting-Edge Tech
                            </span>
                        </motion.h2>

                        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 max-w-7xl mx-auto">
                            {bentoFeatures.map((feature, idx) => {
                                const isLarge = feature.size === "large";
                                const isMedium = feature.size === "medium";
                                const isHovered = hoveredFeature === idx;

                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, y: 40 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: feature.delay, duration: 0.5 }}
                                        onHoverStart={() => setHoveredFeature(idx)}
                                        onHoverEnd={() => setHoveredFeature(null)}
                                        className={`
                                            relative group
                                            ${isLarge ? 'md:col-span-3 md:row-span-2' : isMedium ? 'md:col-span-3' : 'md:col-span-2'}
                                        `}
                                    >
                                        <div className="glass-panel p-8 h-full relative overflow-hidden transition-all duration-500 hover:scale-[1.02]">
                                            {/* Animated gradient background */}
                                            <motion.div
                                                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
                                                animate={isHovered ? {
                                                    background: [
                                                        `linear-gradient(135deg, ${feature.gradient})`,
                                                        `linear-gradient(225deg, ${feature.gradient})`,
                                                        `linear-gradient(135deg, ${feature.gradient})`,
                                                    ]
                                                } : {}}
                                                transition={{ duration: 3, repeat: Infinity }}
                                            />

                                            {/* Icon with 3D effect */}
                                            <motion.div
                                                className="relative mb-6"
                                                whileHover={{ rotateY: 15, rotateX: 15 }}
                                                style={{ transformStyle: "preserve-3d" }}
                                            >
                                                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} rounded-2xl blur-2xl opacity-30 group-hover:opacity-60 transition-opacity`} />
                                                <div className={`relative bg-gradient-to-br ${feature.gradient} p-4 rounded-2xl w-fit`}>
                                                    <feature.icon className="w-8 h-8 text-white" />
                                                </div>

                                                {/* Stat badge */}
                                                <div className="absolute -top-2 -right-2 bg-slate-950/90 border border-white/10 px-3 py-1 rounded-full text-xs font-bold text-white">
                                                    {feature.stat}
                                                </div>
                                            </motion.div>

                                            {/* Content */}
                                            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-blue-200 transition-all duration-300">
                                                {feature.title}
                                            </h3>
                                            <p className={`text-gray-400 leading-relaxed ${isLarge ? 'text-base' : 'text-sm'}`}>
                                                {feature.description}
                                            </p>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </motion.div>

                    {/* Final CTA Section */}
                    <motion.div
                        style={{ y: y2 }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="text-center mb-16 relative"
                    >
                        {/* Glowing background */}
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 blur-3xl -z-10" />

                        <h3 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Ready to transform your workflow?
                        </h3>
                        <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                            Join the future of AI-powered productivity with enterprise-grade security and blazing-fast performance.
                        </p>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={login}
                            className="relative group"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                            <div className="relative bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-lg px-12 py-5 rounded-2xl flex items-center gap-3">
                                <Zap className="w-6 h-6" />
                                <span>Get Started Now</span>
                            </div>
                        </motion.button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
