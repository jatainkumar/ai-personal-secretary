import { motion } from "framer-motion";
import { Person } from "../../types";

interface EditContactModalProps {
    editFormData: Partial<Person>;
    setEditFormData: (data: Partial<Person>) => void;
    handleSaveEdit: () => void;
    handleCancelEdit: () => void;
    isCreating?: boolean;
}

export default function EditContactModal({
    editFormData,
    setEditFormData,
    handleSaveEdit,
    handleCancelEdit,
    isCreating = false
}: EditContactModalProps) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.9, rotateX: 15 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
                className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            >
                <h3 className="text-2xl font-bold text-white mb-4">
                    {isCreating ? "✨ Create New Contact" : "✏️ Edit Contact"}
                </h3>

                <div className="overflow-y-auto flex-1 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">First Name</label>
                            <input
                                type="text"
                                value={editFormData.first_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={editFormData.last_name || ''}
                                onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input
                            type="email"
                            value={editFormData.email || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                            placeholder="contact@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
                        <input
                            type="tel"
                            value={editFormData.phone || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                            placeholder="+1 234 567 8900"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Company</label>
                        <input
                            type="text"
                            value={editFormData.company || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, company: e.target.value })}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Position</label>
                        <input
                            type="text"
                            value={editFormData.position || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">LinkedIn URL</label>
                        <input
                            type="url"
                            value={editFormData.url || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, url: e.target.value })}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                            placeholder="https://linkedin.com/in/..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Address</label>
                        <input
                            type="text"
                            value={editFormData.address || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Birthday</label>
                        <input
                            type="date"
                            value={editFormData.birthday || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, birthday: e.target.value })}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                        <textarea
                            value={editFormData.notes || ''}
                            onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                            rows={3}
                            className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-primary/50 resize-none"
                            placeholder="Additional notes about this contact..."
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-primary/80 hover:bg-primary text-white py-2.5 rounded-lg transition font-medium"
                    >
                        {isCreating ? "✨ Create Contact" : "✅ Save Changes"}
                    </button>
                    <button
                        onClick={handleCancelEdit}
                        className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-white py-2.5 rounded-lg transition font-medium"
                    >
                        ❌ Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
