import { useState } from 'react';
import { api } from '../api/axios';
import { VcfMatchReport, UploadStatus } from '../types';

export function useVcf(userId: string, onEnrichmentComplete: () => void, setUploadStatus: (status: UploadStatus | null) => void) {
    const [showVcfModal, setShowVcfModal] = useState(false);
    const [vcfMatchReport, setVcfMatchReport] = useState<VcfMatchReport | null>(null);
    const [vcfTempDir, setVcfTempDir] = useState<string | null>(null);
    const [vcfOverwriteMode, setVcfOverwriteMode] = useState(false);
    const [vcfContactActions, setVcfContactActions] = useState<Record<string, 'merge' | 'create' | 'skip'>>({});
    const [vcfMatchFilter, setVcfMatchFilter] = useState<'all' | 'exact' | 'partial' | 'none'>('all');
    const [vcfSearchQuery, setVcfSearchQuery] = useState('');

    const handleVcfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploadStatus({ type: "info", message: "📇 Processing VCF files..." });

        const formData = new FormData();
        formData.append("user_id", userId);
        Array.from(files).forEach(file => formData.append("files", file));

        try {
            const res = await api.post(`/persons/enrich-from-vcf`, formData);

            // Initialize actions: exact matches → merge, others → skip
            const initialActions: Record<string, 'merge' | 'create' | 'skip'> = {};
            if (res.data.all_contacts) {
                res.data.all_contacts.forEach((contact: any) => {
                    initialActions[contact.index] = contact.match_type === 'exact' ? 'merge' : 'skip';
                });
            }

            setVcfMatchReport(res.data);
            setVcfTempDir(res.data.temp_dir);
            setVcfContactActions(initialActions);
            setVcfMatchFilter('all');
            setVcfSearchQuery('');
            setShowVcfModal(true);
            setUploadStatus(null);

        } catch (err) {
            setUploadStatus({ type: "error", message: "❌ VCF processing failed" });
            console.error(err);
            setTimeout(() => setUploadStatus(null), 5000);
        }

        // Clear file input
        e.target.value = '';
    };

    const handleConfirmVcfEnrichment = async () => {
        if (!vcfTempDir) return;

        setUploadStatus({ type: "info", message: "⚙️ Applying enrichment..." });
        setShowVcfModal(false);

        const formData = new FormData();
        formData.append("user_id", userId);
        formData.append("temp_dir", vcfTempDir);
        formData.append("overwrite", vcfOverwriteMode.toString());
        formData.append("contact_actions", JSON.stringify(vcfContactActions));

        try {
            const res = await api.post(`/persons/confirm-vcf-enrichment`, formData);

            setUploadStatus({
                type: "success",
                message: `✅ Enriched ${res.data.enriched_count} contacts!` +
                    (res.data.created_count > 0 ? ` Created ${res.data.created_count} new.` : '')
            });

            onEnrichmentComplete();
            setVcfMatchReport(null);
            setVcfTempDir(null);
            setVcfContactActions({});

            setTimeout(() => setUploadStatus(null), 3000);
        } catch (err) {
            setUploadStatus({ type: "error", message: "❌ Enrichment failed" });
            console.error(err);
            setTimeout(() => setUploadStatus(null), 5000);
        }
    };

    const handleCancelVcfEnrichment = () => {
        setShowVcfModal(false);
        setVcfMatchReport(null);
        setVcfTempDir(null);
        setVcfContactActions({});
        setUploadStatus({ type: "info", message: "❌ Enrichment canceled" });
        setTimeout(() => setUploadStatus(null), 2000);
    };

    return {
        showVcfModal,
        setShowVcfModal,
        vcfMatchReport,
        vcfTempDir,
        vcfOverwriteMode,
        setVcfOverwriteMode,
        vcfContactActions,
        setVcfContactActions,
        vcfMatchFilter,
        setVcfMatchFilter,
        vcfSearchQuery,
        setVcfSearchQuery,
        handleVcfUpload,
        handleConfirmVcfEnrichment,
        handleCancelVcfEnrichment
    };
}
