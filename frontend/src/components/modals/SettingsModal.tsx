import React, { useState, useEffect } from 'react';
import { X, Save, Key } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [keys, setKeys] = useState({
    gemini: '',
    groq: '',
    nvidia: '',
    elevenlabs: ''
  });

  useEffect(() => {
    if (isOpen) {
      setKeys({
        gemini: localStorage.getItem('x_gemini_api_key') || '',
        groq: localStorage.getItem('x_groq_api_key') || '',
        nvidia: localStorage.getItem('x_nvidia_api_key') || '',
        elevenlabs: localStorage.getItem('x_elevenlabs_api_key') || '',
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem('x_gemini_api_key', keys.gemini);
    localStorage.setItem('x_groq_api_key', keys.groq);
    localStorage.setItem('x_nvidia_api_key', keys.nvidia);
    localStorage.setItem('x_elevenlabs_api_key', keys.elevenlabs); 
    onClose();
    alert("API Keys saved locally!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-400" />
            API Settings
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-gray-400 mb-6">
          Add your own API keys to bypass system limits. Keys are stored locally on your device.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Gemini API Key</label>
            <input
              type="password"
              value={keys.gemini}
              onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
              placeholder="AIzaSy..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Groq API Key</label>
            <input
              type="password"
              value={keys.groq}
              onChange={(e) => setKeys({ ...keys, groq: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
              placeholder="gsk_..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">NVIDIA API Key</label>
            <input
              type="password"
              value={keys.nvidia}
              onChange={(e) => setKeys({ ...keys, nvidia: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
              placeholder="nvapi-..."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">ElevenLabs API Key</label>
            <input
              type="password"
              value={keys.elevenlabs}
              onChange={(e) => setKeys({ ...keys, elevenlabs: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500/50"
              placeholder="eleven_..."
            />
          </div>
        </div>


        <div className="mt-8 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Keys
          </button>
        </div>
      </div>
    </div>
  );
}