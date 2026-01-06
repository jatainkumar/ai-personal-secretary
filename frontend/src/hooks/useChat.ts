//
import { useRef, useState, useEffect } from "react";
import { api } from "../api/axios";
import { ChatMessage } from "../types";

export function useChat(userId: string | null) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [selectedModel, setSelectedModel] = useState<string>("gemini-fast");
    const chatAbortController = useRef<AbortController | null>(null);

    // Exposed state for parent to react to
    const [meetingProposal, setMeetingProposal] = useState<any | null>(null);

    const sendMessage = async (message: string, model: string) => {
        if (!message.trim() || !userId) return;

        // 1. Add user message to UI immediately
        const userMsg: ChatMessage = { role: "user", content: message };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsTyping(true);

        // 2. Setup Abort Controller
        const abortController = new AbortController();
        chatAbortController.current = abortController;

        // 3. Retrieve Custom Keys (BYOK)
        const geminiKey = localStorage.getItem('x_gemini_api_key');
        const groqKey = localStorage.getItem('x_groq_api_key');
        const nvidiaKey = localStorage.getItem('x_nvidia_api_key');

        // 4. Prepare Headers
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (geminiKey) headers['x-gemini-api-key'] = geminiKey;
        if (groqKey) headers['x-groq-api-key'] = groqKey;
        if (nvidiaKey) headers['x-nvidia-api-key'] = nvidiaKey;

        try {
            // 5. Send Request using existing 'api' instance
            // We pass headers inside the 3rd argument (config object)
            const res = await api.post(`/chat`, {
                user_id: userId,
                query: userMsg.content,
                model_name: model
            }, {
                headers: headers,
                signal: abortController.signal
            });

            // 6. Handle Response
            if (res.data.intent === "schedule_meeting_confirm" && res.data.meeting_details) {
                setMeetingProposal(res.data.meeting_details);
            }

            const assistantMsg: ChatMessage = {
                role: "assistant",
                content: res.data.answer || "I didn't get a response.",
                intent: res.data.intent
            };

            setMessages(prev => [...prev, assistantMsg]);

        } catch (err: any) {
            if (err.name === 'CanceledError' || err.code === "ERR_CANCELED") {
                console.log("Chat request canceled by user");
                return;
            }
            console.error("Chat Error:", err);
            
            // Extract meaningful error message
            let errorMessage = "Sorry, I encountered an error. Please try again.";
            if (err.response?.data?.detail) {
                errorMessage = err.response.data.detail;
            } else if (err.message) {
                errorMessage = `Error: ${err.message}`;
            }

            setMessages(prev => [...prev, { 
                role: "assistant", 
                content: errorMessage,
                intent: "error"
            }]);
        } finally {
            setIsTyping(false);
            chatAbortController.current = null;
        }
    };

    const handleAbortChat = () => {
        if (chatAbortController.current) {
            chatAbortController.current.abort();
            setIsTyping(false);
        }
    };

    const fetchHistory = async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/history`, { params: { user_id: userId } });
            if (res.data.history) {
                setMessages(res.data.history);
            }
        } catch (err) {
            console.error("Failed to fetch history", err);
        }
    };

    const handleClearChat = async () => {
        if (!userId) return;
        if (!window.confirm("Are you sure you want to clear all chat history? This cannot be undone.")) return;
        try {
            await api.delete(`/history`, { params: { user_id: userId } });
            setMessages([]);
        } catch (err: any) {
            console.error("Failed to clear chat history:", err);
            const errorMsg = err.response?.data?.detail || err.message || "Unknown error occurred";
            alert(`Failed to clear history: ${errorMsg}`);
        }
    };

    useEffect(() => {
        if (userId) {
            fetchHistory();
        }
    }, [userId]);

    return {
        messages,
        setMessages,
        input,
        setInput,
        isTyping,
        sendMessage,
        handleAbortChat,
        handleClearChat,
        fetchHistory,
        meetingProposal, 
        setMeetingProposal,
        selectedModel,
        setSelectedModel
    };
}