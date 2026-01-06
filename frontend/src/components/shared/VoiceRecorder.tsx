import { useState, useRef } from "react";
import axios from "axios";
import { Mic, Square, Loader2 } from "lucide-react";

// Fallback to local if environment variable is missing
const API_Base = (import.meta as any).env?.VITE_API_BASE || "https://qcuenjh6mj.us-east-1.awsapprunner.com";

interface VoiceRecorderProps {
    userId: string;
    onTranscriptionComplete: (text: string) => void;
}

export default function VoiceRecorder({ onTranscriptionComplete, userId }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = handleStop;
            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Microphone access denied or not available.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            // Stop all tracks to release microphone
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
    };

    const handleStop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsProcessing(true);

        const formData = new FormData();
        formData.append("file", audioBlob, "voice_note.webm");
        formData.append("user_id", userId);

        // --- KEY INTEGRATION: Fetching keys from localStorage ---
        const geminiKey = localStorage.getItem('x_gemini_api_key');
        const groqKey = localStorage.getItem('x_groq_api_key');
        const nvidiaKey = localStorage.getItem('x_nvidia_api_key');
        const elevenKey = localStorage.getItem('x_elevenlabs_api_key');

        try {
            const res = await axios.post(`${API_Base}/voice/upload`, formData, {
                headers: {
                    // Injecting headers for Backend Error Processing and Key Passthrough
                    'x-gemini-api-key': geminiKey || '',
                    'x-groq-api-key': groqKey || '',
                    'x-nvidia-api-key': nvidiaKey || '',
                    'x-elevenlabs-api-key': elevenKey || '',
                    'Content-Type': 'multipart/form-data',
                }
            });

            if (res.data.transcription) {
                onTranscriptionComplete(res.data.transcription);
            }
        } catch (err) {
            console.error("Voice upload failed:", err);
            // If the backend returns a 401 or 404 (like the Pinecone error you had), 
            // you can log it specifically here.
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex items-center">
            {isProcessing ? (
                <div className="p-3 rounded-full bg-gray-700/50 cursor-wait">
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                </div>
            ) : isRecording ? (
                <button
                    onClick={stopRecording}
                    className="p-3 rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/30 transition border border-red-500/50 animate-pulse"
                    title="Stop Recording"
                >
                    <Square className="w-5 h-5 fill-current" />
                </button>
            ) : (
                <button
                    onClick={startRecording}
                    className="p-3 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition border border-transparent hover:border-primary/30"
                    title="Record Voice Note"
                >
                    <Mic className="w-5 h-5" />
                </button>
            )}
        </div>
    );
}