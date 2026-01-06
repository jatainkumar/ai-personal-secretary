import { useState, useRef, useEffect } from 'react';
import { api } from '../api/axios';
import { UploadStatus } from '../types';

export function useFiles(userId: string | null, setUploadStatusGlobal?: (status: UploadStatus | null) => void, onUploadSuccess?: () => void) {
    const [files, setFiles] = useState<FileList | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Fallback local state if global setter not provided
    const [localUploadStatus, setLocalUploadStatus] = useState<UploadStatus | null>(null);

    const setStatus = (status: UploadStatus | null) => {
        if (setUploadStatusGlobal) {
            setUploadStatusGlobal(status);
        } else {
            setLocalUploadStatus(status);
        }
    };

    const uploadStatus = setUploadStatusGlobal ? null : localUploadStatus;

    const uploadAbortController = useRef<AbortController | null>(null);
    const [knowledgeFiles, setKnowledgeFiles] = useState<string[]>([]);

    const fetchFiles = async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/files`, { params: { user_id: userId } });
            setKnowledgeFiles(res.data.files || []);
        } catch (err) {
            console.error("Failed to fetch files", err);
        }
    };

    const handleFileUpload = async () => {
        if (!files || files.length === 0 || !userId) return;

        setIsUploading(true);
        setStatus({ type: "info", message: "📤 Uploading files..." });

        const abortController = new AbortController();
        uploadAbortController.current = abortController;

        const formData = new FormData();
        formData.append("user_id", userId);
        Array.from(files).forEach(file => {
            formData.append("files", file);
        });

        // --- ADDED: GET USER KEYS FROM LOCAL STORAGE ---
        const geminiKey = localStorage.getItem('x_gemini_api_key');
        const groqKey = localStorage.getItem('x_groq_api_key');
        const nvidiaKey = localStorage.getItem('x_nvidia_api_key');

        try {
            setStatus({ type: "info", message: "⚙️ Processing documents..." });

            // Pass headers so the backend OCR logic can use the user's Gemini key
            await api.post(`/process`, formData, {
                signal: abortController.signal,
                headers: {
                    'x-gemini-api-key': geminiKey || '',
                    'x-groq-api-key': groqKey || '',
                    'x-nvidia-api-key': nvidiaKey || '',
                    'Content-Type': 'multipart/form-data',
                }
            });

            setStatus({ type: "success", message: "✅ Files processed successfully!" });
            setFiles(null);

            fetchFiles();

            if (onUploadSuccess) {
                console.log('📥 File upload successful, triggering contact refresh...');
                setTimeout(() => {
                    console.log('🔄 Calling onUploadSuccess to refresh contacts...');
                    onUploadSuccess();
                }, 500); 
            }

            setTimeout(() => setStatus(null), 3000);
        } catch (err: any) {
            if (err.name === 'CanceledError' || err.code === "ERR_CANCELED") {
                setStatus({ type: "error", message: "❌ Upload canceled" });
            } else {
                // If backend returns 400 (Invalid Key), this will catch it
                setStatus({ type: "error", message: "❌ Processing failed. Check your API Keys in Settings." });
                console.error(err);
            }
            setTimeout(() => setStatus(null), 5000);
        } finally {
            setIsUploading(false);
            uploadAbortController.current = null;
        }
    };

    const handleCancelUpload = () => {
        if (uploadAbortController.current) {
            uploadAbortController.current.abort();
        }
    };

    const handleDeleteFile = async (filename: string) => {
        if (!userId) return;
        try {
            if (!window.confirm(`Delete ${filename}?`)) return;
            await api.delete(`/files`, { params: { user_id: userId, filename } });
            fetchFiles();
        } catch (err) {
            alert("Failed to delete file");
        }
    };

    useEffect(() => {
        if (userId) {
            fetchFiles();
        }
    }, [userId]);

    return {
        files,
        setFiles,
        isUploading,
        uploadStatus,
        handleFileUpload,
        handleCancelUpload,
        handleDeleteFile,
        knowledgeFiles,
        fetchFiles
    };
}