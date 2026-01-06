import { motion } from "framer-motion";
import { Sparkles, Bot, User, Upload, Loader2, FileText, Trash2, Search, Mic, Settings } from "lucide-react";
import { Person } from "../../types";
import VoiceRecorder from "../shared/VoiceRecorder";
import { useState, useMemo, useRef, useCallback } from "react";
import * as React from "react";
import SettingsModal from "../modals/SettingsModal";

interface SidebarProps {
    user: { name: string; email: string; picture?: string };
    activeTab: 'chat' | 'contacts';
    setActiveTab: (tab: 'chat' | 'contacts') => void;

    // Knowledge Base Props
    knowledgeFiles: string[];
    files: FileBase[] | FileList | null;
    setFiles: (files: FileList | null) => void;
    handleFileUpload: () => void;
    isUploading: boolean;
    uploadStatus: { type: 'success' | 'error' | 'info'; message: string; } | null;
    handleCancelUpload: () => void;
    handleDeleteFile: (filename: string) => void;

    // Contacts Props
    persons: Person[];
    handlePersonFileUpload: (personId: string, files: FileList | null) => void;

    // Voice Props
    onVoiceTranscription: (text: string) => void;

    // Actions
    handleClearChat: () => void;
    handleLogout: () => void;

    // Mobile responsive
    isSidebarOpen: boolean;
    setIsSidebarOpen: (open: boolean) => void;
}

// Helper specific to this file usage
type FileBase = File;

export default function Sidebar({
    user,
    activeTab,
    setActiveTab,
    knowledgeFiles,
    files,
    setFiles,
    handleFileUpload,
    isUploading,
    uploadStatus,
    handleCancelUpload,
    handleDeleteFile,
    persons,
    handlePersonFileUpload,
    onVoiceTranscription,
    handleClearChat,
    handleLogout,
    isSidebarOpen,
    setIsSidebarOpen
}: SidebarProps) {

    const fileCount = files ? files.length : 0;

    // Drag and drop state
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // File search state
    const [fileSearchQuery, setFileSearchQuery] = useState("");
    const [fileTypeFilter, setFileTypeFilter] = useState<"all" | "voice" | "document">("all");
    const [fileSortOrder, setFileSortOrder] = useState<"newest" | "oldest" | "name">("newest");

    // Settings Modal State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Filter and sort files
    const filteredFiles = useMemo(() => {
        let filtered = [...knowledgeFiles];

        // Search filter
        if (fileSearchQuery) {
            filtered = filtered.filter(file =>
                file.toLowerCase().includes(fileSearchQuery.toLowerCase())
            );
        }

        // Type filter
        if (fileTypeFilter === "voice") {
            filtered = filtered.filter(file => file.startsWith("Voice_Note_"));
        } else if (fileTypeFilter === "document") {
            filtered = filtered.filter(file => !file.startsWith("Voice_Note_"));
        }

        // Sort
        filtered.sort((a, b) => {
            if (fileSortOrder === "name") {
                return a.localeCompare(b);
            } else if (fileSortOrder === "newest") {
                return b.localeCompare(a); // Reverse alphabetical (newer dates first)
            } else {
                return a.localeCompare(b); // Alphabetical (older dates first)
            }
        });

        return filtered;
    }, [knowledgeFiles, fileSearchQuery, fileTypeFilter, fileSortOrder]);

    // Drag and drop handlers
    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            setFiles(droppedFiles);
        }
    }, [setFiles]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    return (
        <>
            {/* Mobile overlay backdrop */}
            {isSidebarOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setIsSidebarOpen(false)}
                    className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                />
            )}

            <motion.aside
                initial={{ x: -20, opacity: 0 }}
                animate={{
                    x: isSidebarOpen || window.innerWidth >= 1024 ? 0 : -350,
                    opacity: 1
                }}
                className="w-80 m-2 sm:m-4 rounded-2xl sm:rounded-3xl border border-white/20 flex flex-col z-40 lg:z-20 relative overflow-hidden shadow-2xl fixed lg:relative left-0 top-0 h-[calc(100vh-1rem)] sm:h-auto"
                style={{
                    background: 'linear-gradient(180deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
                    backdropFilter: 'blur(8px)',
                    boxShadow: '0 20px 60px -10px rgba(251, 146, 60, 0.2)'
                }}
            >
                <div className="p-6 pb-2">
                    <h2 className="text-lg font-bold flex items-center gap-3 mb-6">
                        <div className="p-2 bg-white/10 backdrop-blur-sm rounded-xl border border-primary/30 shadow-glow-primary animate-pulse-subtle">
                            <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <span className="tracking-wide">AI Secretary</span>
                    </h2>

                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5 flex items-center gap-3 mb-6">
                        {user.picture ? (
                            <img
                                src={user.picture}
                                alt={user.name}
                                className="w-10 h-10 rounded-full ring-2 ring-white/10"
                            />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-600" />
                        )}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                            <p className="text-xs text-gray-400 truncate mb-0.5">{user.email}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                                <p className="text-xs text-gray-400 truncate">Online</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex p-1 bg-black/20 rounded-xl">
                        {['chat', 'contacts'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as 'chat' | 'contacts')}
                                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all duration-300 relative ${activeTab === tab
                                    ? 'text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                    }`}
                            >
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="activeTab"
                                        className="absolute inset-0 bg-gradient-to-r from-primary/80 to-accent/80 rounded-lg"
                                    />
                                )}
                                <span className="relative z-10 capitalize flex items-center justify-center gap-2">
                                    {tab === 'chat' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    {tab}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* MAIN CONTENT AREA - flex-1 pushes everything else down */}
                <div className="p-4 flex-1 overflow-y-auto space-y-4 custom-scrollbar" style={{ scrollPaddingTop: '1rem' }}>
                    {activeTab === 'chat' ? (
                        <>
                            <div className="space-y-3">
                                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Knowledge Base</h2>

                                {/* LinkedIn Instructions Card */}
                                <details className="group">
                                    <summary className="flex items-center gap-2 p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer hover:bg-blue-500/15 transition">
                                        <Bot className="w-4 h-4 text-blue-400 shrink-0" />
                                        <span className="text-xs font-medium text-blue-300 flex-1">How to Download LinkedIn Connections</span>
                                        <svg className="w-3 h-3 text-gray-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </summary>
                                    <div className="mt-2 pl-6 space-y-1.5 text-xs text-gray-400 leading-relaxed">
                                        <p className="flex items-start gap-2">
                                            <span className="text-blue-400 shrink-0">1.</span>
                                            <span>Visit LinkedIn → Settings & Privacy → Data Privacy → Get a copy of your data</span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <span className="text-blue-400 shrink-0">2.</span>
                                            <span>Select "Connections" and request archive (CSV format)</span>
                                        </p>
                                        <p className="flex items-start gap-2">
                                            <span className="text-blue-400 shrink-0">3.</span>
                                            <span>Download the CSV file and upload it here</span>
                                        </p>
                                    </div>
                                </details>

                                {/* File Upload Drop Zone */}
                                <div
                                    onDrop={handleDrop}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${isDragging ? 'border-primary bg-primary/10 scale-[0.98]' : 'border-white/20 hover:border-primary/50 hover:bg-white/5'
                                        }`}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        type="file"
                                        multiple
                                        accept=".pdf,.docx,.txt,.xlsx,.xls,.csv,.vcf,.jpg,.jpeg,.png,.gif,.bmp"
                                        id="file-upload"
                                        className="hidden"
                                        onChange={(e) => setFiles(e.target.files)}
                                        ref={fileInputRef}
                                    />
                                    <Upload className="w-6 h-6 mx-auto mb-2 text-gray-400" />
                                    <p className="text-xs text-gray-400 mb-0.5">Drop files or click to upload</p>
                                    <p className="text-xs text-gray-500">PDF, DOCX, XLSX, CSV, images</p>
                                    {fileCount > 0 && (
                                        <p className="text-xs text-primary mt-1">{fileCount} files selected</p>
                                    )}
                                </div>

                                {fileCount > 0 && (
                                    <div className="mt-4 flex gap-2">
                                        <motion.button
                                            whileHover={{ scale: 1.02, y: -1 }}
                                            whileTap={{ scale: 0.98 }}
                                            onClick={handleFileUpload}
                                            disabled={isUploading}
                                            className="flex-1 bg-gradient-primary hover:shadow-glow-primary text-white py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 text-sm font-medium"
                                        >
                                            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            {isUploading ? "Uploading..." : "Process Files"}
                                        </motion.button>

                                        {isUploading && (
                                            <motion.button
                                                whileHover={{ scale: 1.02 }}
                                                whileTap={{ scale: 0.98 }}
                                                onClick={handleCancelUpload}
                                                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 py-2 px-4 rounded-lg text-sm transition"
                                            >
                                                Cancel
                                            </motion.button>
                                        )}
                                    </div>
                                )}

                                {uploadStatus && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${uploadStatus.type === 'success' ? 'bg-green-500/20 text-green-200 border border-green-500/30' : 'bg-red-500/20 text-red-200 border border-red-500/30'
                                            }`}
                                    >
                                        {uploadStatus.type === 'success' ? <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin mt-0.5" />}
                                        <span>{uploadStatus.message}</span>
                                    </motion.div>
                                )}
                            </div>

                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Stored Files</h3>
                                    <span className="text-xs text-gray-500">({filteredFiles.length}/{knowledgeFiles.length})</span>
                                </div>

                                {/* Search and Filter */}
                                <div className="space-y-1.5 mb-2">
                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                                        <input
                                            type="text"
                                            placeholder="Search..."
                                            value={fileSearchQuery}
                                            onChange={(e) => setFileSearchQuery(e.target.value)}
                                            className="w-full pl-7 pr-2 py-1.5 bg-white/5 border border-white/10 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-primary/50 transition"
                                        />
                                    </div>

                                    {/* Filter Buttons */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => setFileTypeFilter("all")}
                                            className={`flex-1 px-1.5 py-1 rounded text-xs transition ${fileTypeFilter === "all"
                                                ? "bg-primary/20 text-primary border border-primary/50"
                                                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            All
                                        </button>
                                        <button
                                            onClick={() => setFileTypeFilter("voice")}
                                            className={`flex-1 px-1.5 py-1 rounded text-xs transition ${fileTypeFilter === "voice"
                                                ? "bg-primary/20 text-primary border border-primary/50"
                                                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            🎙️
                                        </button>
                                        <button
                                            onClick={() => setFileTypeFilter("document")}
                                            className={`flex-1 px-1.5 py-1 rounded text-xs transition ${fileTypeFilter === "document"
                                                ? "bg-primary/20 text-primary border border-primary/50"
                                                : "bg-white/5 text-gray-400 border border-white/10 hover:border-white/20"
                                                }`}
                                        >
                                            📄
                                        </button>
                                        <select
                                            value={fileSortOrder}
                                            onChange={(e) => setFileSortOrder(e.target.value as any)}
                                            className="flex-1 px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-white focus:outline-none focus:border-primary/50 transition cursor-pointer"
                                        >
                                            <option value="newest" className="bg-gray-800">Newest</option>
                                            <option value="oldest" className="bg-gray-800">Oldest</option>
                                            <option value="name" className="bg-gray-800">A-Z</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto custom-scrollbar">
                                    {filteredFiles.map(file => (
                                        <div key={file} className="flex items-center justify-between p-1.5 bg-white/5 rounded border border-white/10 group hover:border-primary/30 transition">
                                            <div className="flex items-center gap-1.5 overflow-hidden">
                                                {file.startsWith("Voice_Note_") ? (
                                                    <span className="text-xs shrink-0">🎙️</span>
                                                ) : (
                                                    <FileText className="w-3 h-3 text-primary shrink-0" />
                                                )}
                                                <span className="text-xs truncate max-w-[140px]" title={file}>{file}</span>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFile(file)}
                                                className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition p-0.5"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                    {knowledgeFiles.length === 0 && <p className="text-xs text-gray-600 italic text-center py-4">No files indexed.</p>}
                                    {knowledgeFiles.length > 0 && filteredFiles.length === 0 && (
                                        <p className="text-xs text-gray-500 italic text-center py-4">No files match your search.</p>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Voice Recorder - More Prominent */}
                            <div className="mb-6">
                                <div className="relative bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 p-4 rounded-xl border border-primary/20 hover:border-primary/30 transition-all duration-300 shadow-lg hover:shadow-xl">
                                    {/* Subtle glow effect */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-300" />

                                    <div className="relative z-10">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex-1">
                                                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider mb-1 flex items-center gap-2">
                                                    <Mic className="w-3.5 h-3.5 text-primary" />
                                                    Quick Voice Note
                                                </h3>
                                                <p className="text-xs text-gray-500 leading-relaxed">
                                                    Record and transcribe voice notes directly to chat context
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between bg-black/30 backdrop-blur-sm p-3 rounded-lg border border-white/5">
                                            <span className="text-sm font-medium text-white">Tap to Record</span>
                                            <VoiceRecorder
                                                userId={user.email}
                                                onTranscriptionComplete={onVoiceTranscription}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Your Contacts</h3>
                                {persons.length === 0 ? (
                                    <p className="text-xs text-gray-600 italic text-center py-4">No contacts found. Upload a connections CSV to get started.</p>
                                ) : (
                                    persons.map(person => (
                                        <div key={person.id} className="p-3 bg-white/5 rounded-lg border border-white/10 hover:border-primary/20 transition">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-sm font-medium text-white truncate">
                                                        {person.first_name} {person.last_name}
                                                    </h4>
                                                    {person.position && (
                                                        <p className="text-xs text-gray-400 truncate">{person.position}</p>
                                                    )}
                                                    {person.company && (
                                                        <p className="text-xs text-gray-500 truncate">{person.company}</p>
                                                    )}
                                                    {(person.email || person.phone) && (
                                                        <div className="mt-1 text-[10px] text-gray-600 truncate">
                                                            {person.email && <span title={person.email}>📧 {person.email.split('@')[0]}...</span>}
                                                            {person.email && person.phone && <span className="mx-1">•</span>}
                                                            {person.phone && <span>📱</span>}
                                                        </div>
                                                    )}
                                                    {person.files && person.files.length > 0 && (
                                                        <div className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-primary/10 rounded text-[10px] text-primary">
                                                            <FileText className="w-2.5 h-2.5" />
                                                            <span>{person.files.length} file{person.files.length > 1 ? 's' : ''}</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="ml-2 flex-shrink-0">
                                                    <input
                                                        type="file"
                                                        multiple
                                                        accept=".pdf,.docx,.txt,.xlsx,.xls,.csv,.vcf,.jpg,.jpeg,.png,.gif,.bmp"
                                                        id={`person-upload-${person.id}`}
                                                        className="hidden"
                                                        onChange={(e) => handlePersonFileUpload(person.id, e.target.files)}
                                                    />
                                                    <label
                                                        htmlFor={`person-upload-${person.id}`}
                                                        className="cursor-pointer p-1.5 text-gray-500 hover:text-primary hover:bg-primary/10 rounded transition block"
                                                        title="Upload files for this contact"
                                                    >
                                                        <Upload className="w-3.5 h-3.5" />
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
{/* ... existing main content div ends here ... */}
                </div>

                {/* --- SETTINGS BUTTON (Centered, Bold, Rectangular Hover & Icon Animation) --- */}
                <div className="px-4 pb-2 mt-auto">
                    <button 
                        onClick={() => setIsSettingsOpen(true)}
                        className="
                            group flex items-center justify-center gap-2 w-full py-2.5 
                            rounded-lg 
                            text-xs font-bold uppercase tracking-widest 
                            text-gray-400 hover:text-white hover:bg-white/5 
                            transition-all duration-300
                        "
                    >
                        <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-500" />
                        <span>Settings</span>
                    </button>
                </div>

                {/* --- FOOTER (Logout) --- */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="w-full py-2 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors uppercase tracking-widest"
                    >
                        Logout
                    </button>
                </div>
            </motion.aside>

            <SettingsModal 
                isOpen={isSettingsOpen} 
                onClose={() => setIsSettingsOpen(false)} 
            />
        </>
    );
}