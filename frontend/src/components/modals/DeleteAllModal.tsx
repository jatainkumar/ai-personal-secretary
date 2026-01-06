import { motion } from "framer-motion";
import { AlertCircle, Trash2 } from "lucide-react";

interface DeleteAllModalProps {
    contactCount: number;
    handleDeleteAllContacts: () => void;
    onClose: () => void;
}

export default function DeleteAllModal({
    contactCount,
    handleDeleteAllContacts,
    onClose
}: DeleteAllModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="glass-panel p-6 max-w-md w-full"
            >
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white">Delete All Contacts?</h3>
                </div>

                <p className="text-gray-300 mb-2">This will permanently delete <strong className="text-white">{contactCount} contacts</strong> from your database and vector store.</p>
                <p className="text-red-400 text-sm mb-6">⚠️ This action cannot be undone!</p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white py-2.5 rounded-lg transition font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleDeleteAllContacts}
                        className="flex-1 bg-red-500/80 hover:bg-red-500 text-white py-2.5 rounded-lg transition font-medium flex items-center justify-center gap-2"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete All
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
