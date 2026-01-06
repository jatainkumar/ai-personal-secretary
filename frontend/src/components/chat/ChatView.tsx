import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Bot, User, Trash2, StopCircle, Send, Sparkles, MessageSquare, Calendar, FileText, ChevronDown } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from "../../types";

interface ChatViewProps {
    messages: ChatMessage[];
    isTyping: boolean;
    input: string;
    setInput: (val: string) => void;
    sendMessage: (message: string) => void;
    handleAbortChat: () => void;
    handleClearChat: () => void;
    selectedModel: string;
    setSelectedModel: (model: string) => void;
}

const suggestedPrompts = [
    {
        icon: MessageSquare,
        text: "Tell me about my contacts",
        color: "from-blue-500 to-cyan-500"
    },
    {
        icon: Calendar,
        text: "Schedule a meeting",
        color: "from-purple-500 to-pink-500"
    },
    {
        icon: FileText,
        text: "Search my knowledge base",
        color: "from-orange-500 to-amber-500"
    },
    {
        icon: Sparkles,
        text: "What can you help me with?",
        color: "from-green-500 to-emerald-500"
    }
];

const MessageList = React.memo(({ messages, onPromptClick }: { messages: ChatMessage[], onPromptClick: (text: string) => void }) => {
    if (messages.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 px-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="relative mb-8"
                >
                    <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-2xl">
                        <Bot className="w-12 h-12 text-primary" />
                    </div>
                    {/* Animated rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary/30 animate-ping" style={{ animationDuration: '2s' }} />
                    <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 blur-xl animate-pulse" />
                </motion.div>

                <motion.h2
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-white"
                >
                    How can I assist you today?
                </motion.h2>

                <motion.p
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="text-sm text-gray-500 mb-8 text-center max-w-md"
                >
                    I can help you manage contacts, schedule meetings, search your knowledge base, and much more.
                </motion.p>

                {/* Suggested Prompts */}
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl"
                >
                    {suggestedPrompts.map((prompt, idx) => (
                        <motion.button
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + idx * 0.1 }}
                            onClick={() => onPromptClick(prompt.text)}
                            className="suggested-prompt text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${prompt.color} flex items-center justify-center shadow-lg`}>
                                    <prompt.icon className="w-5 h-5 text-white" />
                                </div>
                                <span className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                    {prompt.text}
                                </span>
                            </div>
                        </motion.button>
                    ))}
                </motion.div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {messages.map((msg, idx) => (
                <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{
                        duration: 0.4,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                    className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                    <div className={msg.role === "user" ? "avatar-user" : "avatar-assistant"}>
                        {msg.role === "user" ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
                    </div>

                    <div className={`max-w-[80%] ${msg.role === "user" ? "message-bubble-user" : "message-bubble-assistant"}`}>
                        <div className="prose prose-invert prose-base max-w-none relative z-10">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                            </ReactMarkdown>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
});

const modelOptions = [
    { value: "gemini-fast", label: "Gemini Flash", description: "Fast & Free", color: "from-blue-500 to-cyan-500" },
    { value: "gemini-pro", label: "Gemini Pro", description: "Best Quality", color: "from-purple-500 to-pink-500" },
    { value: "llama3-fast", label: "Llama 3 Fast", description: "Ultra Fast", color: "from-green-500 to-emerald-500" },
    { value: "llama3-smart", label: "Llama 3 Smart", description: "Accurate", color: "from-orange-500 to-amber-500" },
    { value: "nvidia-smart", label: "NVIDIA Smart", description: "Premium", color: "from-red-500 to-rose-500" }
];

export default function ChatView({
    messages,
    isTyping,
    input,
    setInput,
    sendMessage,
    handleAbortChat,
    handleClearChat,
    selectedModel,
    setSelectedModel
}: ChatViewProps) {
    const chatEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = React.useState(false);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isTyping]);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
        }
    }, [input]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsModelDropdownOpen(false);
            }
        };

        if (isModelDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isModelDropdownOpen]);

    const handlePromptClick = (promptText: string) => {
        setInput(promptText);
        setTimeout(() => sendMessage(promptText), 100);
    };

    return (
        <div className="flex w-full h-full flex-col">
            {/* Enhanced Header */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-black/40 sticky top-0 z-50 relative">
                {/* Animated background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-50" />

                <div className="relative z-10 flex items-center gap-3">
                    <div className="relative">
                        <div className="avatar-assistant">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        {/* Pulse indicator */}
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-black/50 animate-pulse" />
                    </div>
                    <div>
                        <h1 className="font-bold text-xl text-white">
                            AI Assistant
                        </h1>
                        <p className="text-sm font-medium text-gray-300">Online & Ready to Help</p>
                    </div>
                </div>

                <div className="relative z-50 flex items-center gap-2">
                    {/* Model Selection Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all duration-300 hover:scale-105 active:scale-95 group"
                            title="Select AI Model"
                        >
                            <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${modelOptions.find(m => m.value === selectedModel)?.color || 'from-blue-500 to-cyan-500'}`} />
                            <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">
                                {modelOptions.find(m => m.value === selectedModel)?.label || "Gemini Flash"}
                            </span>
                            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isModelDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isModelDropdownOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                transition={{ duration: 0.2 }}
                                className="absolute top-full mt-2 right-0 w-56 bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
                            >
                                {modelOptions.map((model) => (
                                    <button
                                        key={model.value}
                                        onClick={() => {
                                            setSelectedModel(model.value);
                                            setIsModelDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${selectedModel === model.value
                                            ? 'bg-white/10 border-l-2 border-primary'
                                            : 'hover:bg-white/5'
                                            }`}
                                    >
                                        <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${model.color} flex-shrink-0`} />
                                        <div className="flex-1">
                                            <div className="text-sm font-medium text-white">{model.label}</div>
                                            <div className="text-xs text-gray-400">{model.description}</div>
                                        </div>
                                        {selectedModel === model.value && (
                                            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </div>
                    <button
                        onClick={handleClearChat}
                        className="p-2.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 group"
                        title="Clear Chat"
                    >
                        <Trash2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar" style={{ scrollPaddingTop: '2rem' }}>
                <MessageList messages={messages} onPromptClick={handlePromptClick} />

                {isTyping && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className="flex gap-4 mt-6"
                    >
                        <div className="avatar-assistant">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <div className="typing-indicator">
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                            <span className="typing-dot" />
                        </div>
                    </motion.div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Enhanced Input Area */}
            <div className="p-6 pt-0 relative z-40">
                <div className="chat-input-container">
                    <textarea
                        ref={textareaRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                sendMessage(input);
                            }
                        }}
                        placeholder="Type your message..."
                        className="w-full bg-transparent border-none focus:ring-0 focus:outline-none resize-none max-h-32 text-gray-100 py-3 px-4 placeholder:text-gray-500"
                        rows={1}
                        style={{ minHeight: '44px' }}
                    />

                    <div className="flex items-center gap-2 pb-1 pr-1">
                        {isTyping ? (
                            <button
                                onClick={handleAbortChat}
                                className="p-3 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all duration-300 shadow-lg hover:scale-110 active:scale-95 group"
                                title="Stop Generating"
                            >
                                <StopCircle className="w-5 h-5 group-hover:animate-pulse" />
                            </button>
                        ) : (
                            <motion.button
                                onClick={() => sendMessage(input)}
                                disabled={!input.trim()}
                                className="send-button disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                                whileTap={{ scale: 0.9 }}
                            >
                                <Send className="w-5 h-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </motion.button>
                        )}
                    </div>
                </div>
                <div className="text-center mt-3 text-xs text-gray-500 flex items-center justify-center gap-2">
                    <Sparkles className="w-3 h-3" />
                    <span>AI can make mistakes. Verify important information.</span>
                </div>
            </div>
        </div>
    );
}
