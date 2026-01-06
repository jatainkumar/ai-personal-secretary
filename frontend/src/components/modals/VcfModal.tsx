import { motion } from "framer-motion";
import { VcfMatchReport } from "../../types";

interface VcfModalProps {
    vcfMatchReport: VcfMatchReport;
    vcfMatchFilter: 'all' | 'exact' | 'partial' | 'none';
    setVcfMatchFilter: (filter: 'all' | 'exact' | 'partial' | 'none') => void;
    vcfSearchQuery: string;
    setVcfSearchQuery: (query: string) => void;
    vcfOverwriteMode: boolean;
    setVcfOverwriteMode: (val: boolean) => void;
    vcfContactActions: Record<string, 'merge' | 'create' | 'skip'>;
    setVcfContactActions: (actions: Record<string, 'merge' | 'create' | 'skip'>) => void;
    handleConfirmVcfEnrichment: () => void;
    handleCancelVcfEnrichment: () => void;
}

export default function VcfModal({
    vcfMatchReport,
    vcfMatchFilter,
    setVcfMatchFilter,
    vcfSearchQuery,
    setVcfSearchQuery,
    vcfOverwriteMode,
    setVcfOverwriteMode,
    vcfContactActions,
    setVcfContactActions,
    handleConfirmVcfEnrichment,
    handleCancelVcfEnrichment
}: VcfModalProps) {
    if (!vcfMatchReport) return null;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 50 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl p-6 max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="mb-4">
                    <h3 className="text-2xl font-bold text-white mb-2">📇 VCF Enrichment - Per Contact Control</h3>
                    <div className="flex gap-4 text-sm">
                        <span className="text-green-400">✅ {vcfMatchReport.exact_matches} Exact</span>
                        <span className="text-yellow-400">⚠️ {vcfMatchReport.partial_matches} Partial</span>
                        <span className="text-gray-400">❌ {vcfMatchReport.no_matches} No Match</span>
                    </div>
                </div>

                {/* Filter Buttons */}
                <div className="mb-4 flex gap-2">
                    <button
                        onClick={() => setVcfMatchFilter('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${vcfMatchFilter === 'all'
                            ? 'bg-primary text-white'
                            : 'bg-black/30 text-gray-400 hover:bg-black/40 hover:text-white'
                            }`}
                    >
                        All ({vcfMatchReport.all_contacts?.length || 0})
                    </button>
                    <button
                        onClick={() => setVcfMatchFilter('exact')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${vcfMatchFilter === 'exact'
                            ? 'bg-green-500/80 text-white border border-green-400'
                            : 'bg-black/30 text-gray-400 hover:bg-green-500/20 hover:text-green-400'
                            }`}
                    >
                        ✅ Exact ({vcfMatchReport.exact_matches})
                    </button>
                    <button
                        onClick={() => setVcfMatchFilter('partial')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${vcfMatchFilter === 'partial'
                            ? 'bg-yellow-500/80 text-white border border-yellow-400'
                            : 'bg-black/30 text-gray-400 hover:bg-yellow-500/20 hover:text-yellow-400'
                            }`}
                    >
                        ⚠️ Partial ({vcfMatchReport.partial_matches})
                    </button>
                    <button
                        onClick={() => setVcfMatchFilter('none')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition ${vcfMatchFilter === 'none'
                            ? 'bg-gray-500/80 text-white border border-gray-400'
                            : 'bg-black/30 text-gray-400 hover:bg-gray-500/20 hover:text-gray-300'
                            }`}
                    >
                        ❌ No Match ({vcfMatchReport.no_matches})
                    </button>
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                    <input
                        type="text"
                        placeholder="🔍 Search contacts by name, email, or phone..."
                        value={vcfSearchQuery}
                        onChange={(e) => setVcfSearchQuery(e.target.value)}
                        className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2.5 text-white placeholder:text-gray-500 focus:outline-none focus:border-primary/50 transition"
                    />
                </div>

                {/* Global Overwrite Option */}
                <div className="mb-4 bg-black/20 p-3 rounded-lg border border-white/10">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={vcfOverwriteMode}
                            onChange={(e) => setVcfOverwriteMode(e.target.checked)}
                            className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary"
                        />
                        <div>
                            <span className="text-white font-medium">Overwrite existing data</span>
                            <p className="text-xs text-gray-400">When merging, replace existing values with VCF data</p>
                        </div>
                    </label>
                </div>

                {/* Contact List - Scrollable */}
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {vcfMatchReport.all_contacts
                        ?.filter(contact => {
                            // Match type filter
                            if (vcfMatchFilter === 'all') {
                                // pass
                            } else if (vcfMatchFilter === 'exact' && contact.match_type !== 'exact') {
                                return false;
                            } else if (vcfMatchFilter === 'partial' && contact.match_type !== 'partial') {
                                return false;
                            } else if (vcfMatchFilter === 'none' && contact.match_type !== 'none') {
                                return false;
                            }

                            // Search query filter
                            if (vcfSearchQuery.trim()) {
                                const query = vcfSearchQuery.toLowerCase();
                                const matchesName = contact.vcf_name?.toLowerCase().includes(query);
                                const matchesEmail = contact.vcf_email?.toLowerCase().includes(query);
                                const matchesPhone = contact.vcf_phone?.toLowerCase().includes(query);
                                const matchesExisting = contact.matched_contact_name?.toLowerCase().includes(query);

                                if (!(matchesName || matchesEmail || matchesPhone || matchesExisting)) {
                                    return false;
                                }
                            }

                            return true;
                        })
                        ?.map((contact) => (
                            <div
                                key={contact.index}
                                className="bg-black/30 p-4 rounded-lg border border-white/10 hover:border-white/20 transition"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    {/* VCF Info */}
                                    <div className="flex-1">
                                        <div className="text-white font-medium text-lg mb-1">{contact.vcf_name}</div>
                                        <div className="text-sm text-gray-400 space-x-3">
                                            {contact.vcf_email && <span>📧 {contact.vcf_email}</span>}
                                            {contact.vcf_phone && <span>📱 {contact.vcf_phone}</span>}
                                        </div>
                                    </div>

                                    {/* Match Badge */}
                                    <div className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${contact.match_type === 'exact' ? 'bg-green-500/20 text-green-400 border border-green-500/50' :
                                        contact.match_type === 'partial' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                            'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                                        }`}>
                                        {contact.match_type === 'exact' ? '✅ Exact Match' :
                                            contact.match_type === 'partial' ? '⚠️ Partial Match' :
                                                '❌ No Match'}
                                    </div>
                                </div>

                                {/* Matched Contact Display */}
                                {contact.matched_contact_name && (
                                    <div className="text-sm text-gray-300 mb-3 pl-4 border-l-2 border-primary/50">
                                        → Matches existing contact: <span className="text-primary font-medium">{contact.matched_contact_name}</span>
                                        {contact.matched_contact_company && <span className="text-gray-400"> • {contact.matched_contact_company}</span>}
                                    </div>
                                )}

                                {/* Action Dropdown */}
                                <select
                                    value={vcfContactActions[contact.index] || 'skip'}
                                    onChange={(e) => setVcfContactActions({
                                        ...vcfContactActions,
                                        [contact.index]: e.target.value as 'merge' | 'create' | 'skip'
                                    })}
                                    className="w-full bg-black/40 border border-white/20 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary/50 transition"
                                >
                                    {contact.match_type !== 'none' && (
                                        <option value="merge">🔄 Merge with existing contact</option>
                                    )}
                                    <option value="create">➕ Create new contact</option>
                                    <option value="skip">⏭️ Skip this contact</option>
                                </select>
                            </div>
                        ))}
                </div>

                {/* Action Summary */}
                <div className="bg-black/20 p-3 rounded-lg border border-white/10 mb-4 text-sm text-gray-300">
                    <strong>Actions:</strong>{' '}
                    {Object.values(vcfContactActions).filter(a => a === 'merge').length} merge,{' '}
                    {Object.values(vcfContactActions).filter(a => a === 'create').length} create,{' '}
                    {Object.values(vcfContactActions).filter(a => a === 'skip').length} skip
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <button
                        onClick={handleConfirmVcfEnrichment}
                        className="flex-1 bg-primary hover:bg-primary/80 text-white py-3 rounded-lg font-medium transition"
                    >
                        ✅ Apply Enrichment
                    </button>
                    <button
                        onClick={handleCancelVcfEnrichment}
                        className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-medium transition"
                    >
                        ❌ Cancel
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}
