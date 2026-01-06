import { motion } from "framer-motion";
import { MeetingDetails } from "../../types";

interface MeetingModalProps {
    meetingDetails: MeetingDetails | null;
    handleConfirmMeeting: () => void;
    handleCancelMeeting: () => void;
}

export default function MeetingModal({
    meetingDetails,
    handleConfirmMeeting,
    handleCancelMeeting
}: MeetingModalProps) {
    if (!meetingDetails) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
            <motion.div
                initial={{ opacity: 0, y: -50, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 50, scale: 0.95 }}
                transition={{ type: "spring", damping: 25 }}
                className="glass-panel p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
                <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                    <span>📅</span> Confirm Meeting
                </h2>
                <p className="text-gray-400 text-sm mb-6">Please review the meeting details before scheduling</p>

                <div className="space-y-4 bg-black/30 rounded-lg p-4 border border-white/10">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Title</label>
                        <p className="text-white font-medium">{meetingDetails.summary}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Start Time</label>
                            <p className="text-white">{meetingDetails.start_time ? new Date(meetingDetails.start_time.replace('T', ' ')).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</p>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">End Time</label>
                            <p className="text-white">{meetingDetails.end_time ? new Date(meetingDetails.end_time.replace('T', ' ')).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'N/A'}</p>
                        </div>
                    </div>

                    {meetingDetails.description && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                            <p className="text-gray-300 text-sm">{meetingDetails.description || 'No description'}</p>
                        </div>
                    )}

                    {meetingDetails.attendees && meetingDetails.attendees.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Attendees</label>
                            <div className="flex flex-wrap gap-2">
                                {meetingDetails.attendees.map((email, idx) => (
                                    <span key={idx} className="px-2 py-1 bg-primary/20 border border-primary/30 rounded text-xs text-primary">
                                        {email}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={handleConfirmMeeting}
                        className="flex-1 bg-primary/80 hover:bg-primary text-white py-3 rounded-lg transition font-medium flex items-center justify-center gap-2"
                    >
                        ✅ Schedule Meeting
                    </button>
                    <button
                        onClick={handleCancelMeeting}
                        className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white py-3 rounded-lg transition font-medium"
                    >
                        ❌ Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
