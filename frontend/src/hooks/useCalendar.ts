import { useState, useRef, useCallback } from "react";
import { api } from "../api/axios";
import { MeetingDetails, UploadStatus } from "../types";

export type { MeetingDetails }; // Export for consumption

// NOTE: The previous useMeeting implementation took setMessages etc. to communicate with Chat.
// To keep hooks decoupled as per User request (logic in hooks), I will accept necessary callbacks.

export function useCalendar(
    userId: string | null,
    setMessages: (updater: (prev: any[]) => any[]) => void, // Simple typed callback for chat history update
    setUploadStatus: (status: UploadStatus | null) => void
) {
    const [meetingDetails, _setMeetingDetails] = useState<MeetingDetails | null>(null);
    const [showModal, _setShowModal] = useState(false); // Can serve as showMeetingModal

    // Wrapped setters with logging
    const setMeetingDetails = useCallback((details: MeetingDetails | null) => {
        console.log("📅 setMeetingDetails called with:", details);
        _setMeetingDetails(details);
    }, []);

    const setShowModal = useCallback((show: boolean) => {
        console.log("📅 setShowModal called with:", show);
        _setShowModal(show);
    }, []);

    const confirmMeeting = async () => {
        if (!meetingDetails) return;

        setShowModal(false);
        setUploadStatus({ type: "info", message: "📅 Scheduling meeting..." });

        try {
            const res = await api.post("/schedule/confirm", meetingDetails);

            // Short, clean message for toast notification
            const toastMsg = `Meeting scheduled! 📅 ${meetingDetails.summary} on ${new Date(meetingDetails.start_time).toLocaleDateString()} at ${new Date(meetingDetails.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

            // Detailed markdown message for chat
            const chatMsg = `✅ **Meeting scheduled successfully!**\n\n📅 **${meetingDetails.summary}**\n⏰ ${new Date(meetingDetails.start_time).toLocaleString()}\n\n🔗 [View in Calendar](${res.data.link})\n${res.data.meet_link ? `🎥 [Join Google Meet](${res.data.meet_link})` : ''}`;

            setUploadStatus({ type: "success", message: toastMsg });

            // Add success message to chat
            // Note: We need to match the ChatMessage structure from types
            setMessages((prev: any[]) => [...prev, { role: "assistant", content: chatMsg }]);

            setTimeout(() => setUploadStatus(null), 6000);
        } catch (err: any) {
            const errorMsg = `❌ Failed to schedule meeting: ${err.response?.data?.detail || err.message} `;
            setUploadStatus({ type: "error", message: errorMsg });
            console.error("Meeting scheduling error:", err);
            setTimeout(() => setUploadStatus(null), 5000);
        } finally {
            setMeetingDetails(null);
        }
    };

    const cancelMeeting = () => {
        console.log("🚫 cancelMeeting called");
        console.trace("Stack trace for cancelMeeting");
        setShowModal(false);
        setMeetingDetails(null);

        // Add cancellation message to chat
        setMessages((prev: any[]) => [...prev, { role: "assistant", content: "Meeting scheduling canceled." }]);
    };

    return {
        meetingDetails,
        setMeetingDetails, // Exposed for Chat hook to set
        showMeetingModal: showModal, // Explicit naming
        setShowMeetingModal: setShowModal,
        confirmMeeting,
        cancelMeeting
    };
}
