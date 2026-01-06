import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { User, Upload, Trash2, Pencil, Linkedin, Search } from "lucide-react";
import { Person } from "../../types";

interface ContactsViewProps {
    persons: Person[];
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    handleVcfUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setShowDeleteAllModal: (show: boolean) => void;
    handleEditPerson: (person: Person) => void;
    handleDeletePerson: (person: Person) => void;
    handlePersonFileUpload: (personId: string, files: FileList | null) => void;
    handlePersonFileDelete: (personId: string, filename: string) => void;
    handleCreatePerson: () => void;
}

export default function ContactsView({
    persons,
    searchQuery,
    setSearchQuery,
    handleVcfUpload,
    setShowDeleteAllModal,
    handleEditPerson,
    handleDeletePerson,
    handlePersonFileUpload,
    handlePersonFileDelete,
    handleCreatePerson
}: ContactsViewProps) {
    const [localSearch, setLocalSearch] = useState(searchQuery);

    useEffect(() => {
        const timer = setTimeout(() => {
            setSearchQuery(localSearch);
        }, 300); // 300ms debounce

        return () => clearTimeout(timer);
    }, [localSearch, setSearchQuery]);

    // Sync local state if parent updates search query (optional but good practice)
    useEffect(() => {
        if (searchQuery !== localSearch) {
            // Only update if they differ significantly to avoid loops? 
            // Actually, usually you just want one-way sync from input -> prop unless external clear happen.
            // But if we clear from parent, we need this.
            // simplified: only update local if parent changes and is empty (clear) or different context
            if (searchQuery === '') setLocalSearch('');
        }
    }, [searchQuery]);


    // PERFORMANCE OPTIMIZATION: Memoize filtered contacts to prevent re-filtering on every render
    const filteredPersons = useMemo(() => {
        if (!searchQuery) return persons;

        const query = searchQuery.toLowerCase().trim();
        if (!query) return persons;

        // Split into tokens for multi-word search
        const searchTokens = query.split(/\s+/).filter(token => token.length > 0);

        // Fuzzy search with relevance scoring (ALL tokens must match)
        const scoredPersons = persons.map(p => {
            let score = 0;
            let matchedTokens = 0;

            // Searchable fields with weights
            const firstName = (p.first_name || '').toLowerCase();
            const lastName = (p.last_name || '').toLowerCase();
            const fullName = `${firstName} ${lastName}`;
            const email = (p.email || '').toLowerCase();
            const company = (p.company || '').toLowerCase();
            const position = (p.position || '').toLowerCase();

            searchTokens.forEach(token => {
                let tokenMatched = false;

                // Exact matches (highest score)
                if (firstName === token) { score += 100; tokenMatched = true; }
                else if (lastName === token) { score += 100; tokenMatched = true; }
                // Starts with (high score)
                else if (firstName.startsWith(token)) { score += 50; tokenMatched = true; }
                else if (lastName.startsWith(token)) { score += 50; tokenMatched = true; }
                // Contains in name (medium-high score)
                else if (firstName.includes(token)) { score += 30; tokenMatched = true; }
                else if (lastName.includes(token)) { score += 30; tokenMatched = true; }
                // Full name match
                else if (fullName.includes(token)) { score += 20; tokenMatched = true; }
                // Position match (medium score)
                else if (position.includes(token)) { score += 15; tokenMatched = true; }
                // Company match (lower score)
                else if (company.includes(token)) { score += 10; tokenMatched = true; }
                // Email match (low score)
                else if (email.includes(token)) { score += 5; tokenMatched = true; }

                if (tokenMatched) matchedTokens++;
            });

            // Only include if ALL tokens matched
            return { person: p, score, matchedAll: matchedTokens === searchTokens.length };
        });

        // Filter to only contacts where ALL tokens matched, then sort by score
        return scoredPersons
            .filter(item => item.matchedAll && item.score > 0)
            .sort((a, b) => b.score - a.score)
            .map(item => item.person);
    }, [persons, searchQuery]);

    return (
        <div className="flex w-full h-full flex-col">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-black/10 backdrop-blur-md sticky top-0 z-30">
                <h1 className="font-semibold text-base sm:text-lg flex items-center gap-2">
                    <User className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
                    <span>Contacts <span className="text-gray-500 text-xs sm:text-sm ml-2">({persons.length})</span></span>
                </h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative group flex-1 sm:flex-initial">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-500 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search contacts..."
                            className="bg-white/5 border border-white/10 group-hover:border-white/20 rounded-lg py-1.5 sm:py-2 pl-9 sm:pl-10 pr-3 sm:pr-4 text-xs sm:text-sm w-full sm:w-64 text-gray-200 placeholder:text-gray-500 focus:bg-white/10 focus:border-primary/50 focus:ring-1 focus:ring-primary/50 focus:outline-none transition-all"
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 custom-scrollbar">

                {/* Contacts Header */}
                <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500 mb-2">Contact Management</h2>
                        <p className="text-sm sm:text-base text-gray-400">Upload LinkedIn connections CSV to automatically extract contacts.</p>
                    </div>
                    <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                        <button
                            onClick={handleCreatePerson}
                            className="flex-1 sm:flex-initial bg-primary hover:bg-primary/90 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 shadow-lg hover:shadow-glow-primary transition-all duration-300 transform hover:-translate-y-0.5 font-medium text-sm sm:text-base"
                        >
                            <User className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>Create</span>
                        </button>
                        <button
                            onClick={() => document.getElementById('vcf-input')?.click()}
                            className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 text-white py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 border border-white/10 transition-all duration-300 font-medium text-sm sm:text-base"
                        >
                            <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span className="hidden sm:inline">Import VCF</span>
                            <span className="sm:hidden">Import</span>
                        </button>
                        {persons.length > 0 && (
                            <button
                                onClick={() => setShowDeleteAllModal(true)}
                                className="px-3 sm:px-4 py-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/20 hover:border-red-500/50 transition-all duration-300 flex items-center gap-2 text-sm sm:text-base"
                            >
                                <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                                <span className="hidden sm:inline">Delete All</span>
                            </button>
                        )}
                    </div>
                    <input
                        id="vcf-input"
                        type="file"
                        accept=".vcf"
                        multiple
                        onChange={handleVcfUpload}
                        className="hidden"
                    />
                </div>

                {/* Contacts Grid */}
                {persons.length === 0 ? (
                    <div className="h-[60vh] flex flex-col items-center justify-center text-center opacity-60">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6 animate-pulse-glow">
                            <User className="w-12 h-12 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">No contacts yet</h3>
                        <p className="text-gray-500 max-w-xs mx-auto">Upload a VCF file or sync your LinkedIn connections to get started.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                        {filteredPersons.map((person, idx) => (
                            <motion.div
                                key={person.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.02, duration: 0.25, ease: "easeOut" }}
                                whileHover={{ y: -2 }}
                                className="glass-panel p-6 group relative stagger-item border border-white/5 bg-white/5 hover:border-primary/20 backdrop-blur-md transition-colors"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl pointer-events-none" />

                                <div className="relative z-10">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-xl font-bold text-white shadow-inner">
                                            {person.first_name?.[0]}{person.last_name?.[0]}
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                                            <label className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-primary transition-colors duration-150 cursor-pointer" title="Upload files">
                                                <Upload className="w-4 h-4" />
                                                <input type="file" className="hidden" multiple accept=".pdf,.docx,.txt,.xlsx,.xls,.csv,.vcf,.jpg,.jpeg,.png,.gif,.bmp" onChange={(e) => handlePersonFileUpload(person.id, e.target.files)} />
                                            </label>
                                            <button onClick={() => handleEditPerson(person)} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors duration-150">
                                                <Pencil className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDeletePerson(person)} className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors duration-150">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-1 truncate">{person.first_name} {person.last_name}</h3>
                                    <p className="text-primary text-sm font-medium mb-4 truncate">{person.position} {person.company && `at ${person.company}`}</p>

                                    <div className="space-y-2 text-sm text-gray-400">
                                        {person.email && (
                                            <div className="flex items-center gap-2 hover:text-gray-200 transition-colors duration-150">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <a href={`mailto:${person.email}`} className="truncate">{person.email}</a>
                                            </div>
                                        )}
                                        {person.phone && (
                                            <div className="flex items-center gap-2 hover:text-gray-200 transition-colors duration-150">
                                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                <a href={`tel:${person.phone}`} className="truncate">{person.phone}</a>
                                            </div>
                                        )}
                                        {person.url && (
                                            <div className="flex items-center gap-2 hover:text-gray-200 transition-colors duration-150">
                                                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                                <a href={person.url} target="_blank" rel="noopener noreferrer" className="truncate flex items-center gap-1">
                                                    <Linkedin className="w-3.5 h-3.5" />
                                                    <span>LinkedIn Profile</span>
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {/* Files List */}
                                    {person.files && person.files.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-white/5">
                                            <div className="text-xs text-gray-500 mb-2">{person.files.length} {person.files.length === 1 ? 'File' : 'Files'} attached</div>
                                            <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar">
                                                {person.files.map((filename, fileIdx) => (
                                                    <div key={fileIdx} className="flex items-center gap-2 text-xs bg-white/5 rounded-lg p-2 hover:bg-white/10 transition group">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                                                        <span className="text-gray-300 truncate flex-1">{filename}</span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handlePersonFileDelete(person.id, filename);
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition shrink-0"
                                                            title="Delete file"
                                                        >
                                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
