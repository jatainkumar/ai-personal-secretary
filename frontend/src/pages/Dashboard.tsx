import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";

// Components
import Background3D from "../components/shared/Background3D";
import ErrorBoundary from "../components/shared/ErrorBoundary";
import Sidebar from "../components/layout/Sidebar";
import ChatView from "../components/chat/ChatView";
import ContactsView from "../components/contacts/ContactsView";

// Modals
import VcfModal from "../components/modals/VcfModal";
import MeetingModal from "../components/modals/MeetingModal";
import EditContactModal from "../components/modals/EditContactModal";
import DeleteAllModal from "../components/modals/DeleteAllModal";

// Hooks
import { useChat } from "../hooks/useChat";
import { useFiles } from "../hooks/useFiles";
import { useContacts } from "../hooks/useContacts";
import { useVcf } from "../hooks/useVcf";
import { useCalendar } from "../hooks/useCalendar";
import { UploadStatus } from "../types";
import { api } from "../api/axios";

export default function Dashboard() {
    const { user, logout } = useAuth();
    const userId = user?.email || null;

    const [activeTab, setActiveTab] = useState<'chat' | 'contacts'>('chat');
    const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
    const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar toggle

    // --- HOOKS ORCHESTRATION ---

    // 1. Chat Hook
    const chatHook = useChat(userId);

    // 2. Calendar Hook
    const calendarHook = useCalendar(userId, chatHook.setMessages, setUploadStatus);

    // 3. Connect Chat -> Calendar
    useEffect(() => {
        if (chatHook.meetingProposal) {
            console.log("📅 Setting meeting details:", chatHook.meetingProposal);
            calendarHook.setMeetingDetails(chatHook.meetingProposal);
            calendarHook.setShowMeetingModal(true);
            chatHook.setMeetingProposal(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chatHook.meetingProposal]);

    // 4. Files Hook
    const filesHook = useFiles(userId, setUploadStatus, () => {
        // Refresh contacts after CSV/XLSX upload
        contactsHook.fetchPersons();
    });

    // 5. Contacts Hook
    const contactsHook = useContacts(userId, setUploadStatus);

    // 6. VCF Hook
    const vcfHook = useVcf(userId || '', () => {
        contactsHook.fetchPersons();
        filesHook.fetchFiles();
    }, setUploadStatus);

    // Auto-dismiss success and error notifications after 3 seconds
    useEffect(() => {
        if (uploadStatus && (uploadStatus.type === 'success' || uploadStatus.type === 'error')) {
            const timer = setTimeout(() => {
                setUploadStatus(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [uploadStatus]);

    // Voice transcription handler
    const handleVoiceTranscription = (text: string) => {
        // Switch to chat tab
        setActiveTab('chat');

        // Add voice note message to chat
        const voiceMsg = {
            role: 'assistant' as const,
            content: `🎙️ **Voice Note Saved:**\n\n_${text}_`
        };
        chatHook.setMessages(prev => [...prev, voiceMsg]);

        // Refresh files to show the new voice note
        filesHook.fetchFiles();
    };

    // Handlers specific to Dashboard layout
    const executeDeleteAll = async () => {
        setShowDeleteAllModal(false);
        setUploadStatus({ type: "info", message: "🗑️ Deleting all contacts..." });
        try {
            await api.delete(`/persons/all?user_id=${user?.email}`);
            setUploadStatus({ type: "success", message: "✅ Deleted contacts successfully!" });
            contactsHook.fetchPersons();
        } catch (err) {
            setUploadStatus({ type: "error", message: "❌ Failed to delete contacts" });
        }
    };

    if (!user) return null; // Should be handled by App router ideally

    return (
        <div className="h-screen flex text-gray-100 overflow-hidden relative selection:bg-primary/30">
            <ErrorBoundary fallback={<div className="fixed inset-0 -z-10 bg-darkBg" />}>
                <Background3D />
            </ErrorBoundary>

            {/* Decorative Orbs */}
            <div className="fixed top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
            <div className="fixed bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-3 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 hover:bg-white/20 transition-colors"
                aria-label="Toggle menu"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {isSidebarOpen ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    )}
                </svg>
            </button>

            <Sidebar
                user={user}
                activeTab={activeTab}
                setActiveTab={setActiveTab}

                // Knowledge Base
                knowledgeFiles={filesHook.knowledgeFiles}
                files={filesHook.files}
                setFiles={filesHook.setFiles}
                handleFileUpload={filesHook.handleFileUpload}
                isUploading={filesHook.isUploading}
                uploadStatus={uploadStatus}
                handleCancelUpload={filesHook.handleCancelUpload}
                handleDeleteFile={filesHook.handleDeleteFile}

                // Contacts
                persons={contactsHook.persons}
                handlePersonFileUpload={contactsHook.handlePersonFileUpload}

                // Voice
                onVoiceTranscription={handleVoiceTranscription}

                // Actions
                handleClearChat={chatHook.handleClearChat}
                handleLogout={logout}

                // Mobile responsive
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
            />

            <main className="flex-1 m-2 sm:m-4 glass-panel flex flex-col relative overflow-hidden z-20">
                {activeTab === 'chat' ? (
                    <ChatView
                        messages={chatHook.messages}
                        isTyping={chatHook.isTyping}
                        input={chatHook.input}
                        setInput={chatHook.setInput}
                       
                        sendMessage={(msg) => {chatHook.sendMessage(msg, chatHook.selectedModel)}}
                        handleAbortChat={chatHook.handleAbortChat}
                        handleClearChat={chatHook.handleClearChat}
                        selectedModel={chatHook.selectedModel}
                        setSelectedModel={chatHook.setSelectedModel}
                    />
                ) : (
                    <ContactsView
                        persons={contactsHook.persons}
                        searchQuery={contactsHook.searchQuery}
                        setSearchQuery={contactsHook.setSearchQuery}
                        handleVcfUpload={vcfHook.handleVcfUpload}
                        setShowDeleteAllModal={setShowDeleteAllModal}
                        handleEditPerson={contactsHook.handleEditPerson}
                        handleCreatePerson={contactsHook.handleCreatePerson}
                        handleDeletePerson={contactsHook.handleDeletePerson}
                        handlePersonFileUpload={contactsHook.handlePersonFileUpload}
                        handlePersonFileDelete={contactsHook.handlePersonFileDelete}
                    />
                )
                }
            </main>

            {/* --- MODALS --- */}

            <VcfModal
                vcfMatchReport={vcfHook.vcfMatchReport!}
                vcfMatchFilter={vcfHook.vcfMatchFilter}
                setVcfMatchFilter={vcfHook.setVcfMatchFilter}
                vcfSearchQuery={vcfHook.vcfSearchQuery}
                setVcfSearchQuery={vcfHook.setVcfSearchQuery}
                vcfOverwriteMode={vcfHook.vcfOverwriteMode}
                setVcfOverwriteMode={vcfHook.setVcfOverwriteMode}
                vcfContactActions={vcfHook.vcfContactActions}
                setVcfContactActions={vcfHook.setVcfContactActions}
                handleConfirmVcfEnrichment={vcfHook.handleConfirmVcfEnrichment}
                handleCancelVcfEnrichment={vcfHook.handleCancelVcfEnrichment}
            />

            <MeetingModal
                meetingDetails={calendarHook.meetingDetails}
                handleConfirmMeeting={calendarHook.confirmMeeting}
                handleCancelMeeting={calendarHook.cancelMeeting}
            />

            {(contactsHook.editingPerson || contactsHook.isCreating) && (
                <EditContactModal
                    editFormData={contactsHook.editFormData}
                    setEditFormData={contactsHook.setEditFormData}
                    handleSaveEdit={contactsHook.handleSaveEdit}
                    handleCancelEdit={contactsHook.handleCancelEdit}
                    isCreating={contactsHook.isCreating}
                />
            )}

            {showDeleteAllModal && (
                <DeleteAllModal
                    contactCount={contactsHook.persons.length}
                    handleDeleteAllContacts={executeDeleteAll}
                    onClose={() => setShowDeleteAllModal(false)}
                />
            )}

            {/* Global Toast */}
            <AnimatePresence>
                {uploadStatus && (
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-2xl border z-50 max-w-md animate-bounce-in ${uploadStatus.type === 'success'
                            ? 'bg-green-500/90 border-green-400 text-white'
                            : uploadStatus.type === 'error'
                                ? 'bg-red-500/90 border-red-400 text-white animate-shake'
                                : 'bg-blue-500/90 border-blue-400 text-white'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            {uploadStatus.type === 'info' && (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            )}
                            <p className="font-medium">{uploadStatus.message}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}