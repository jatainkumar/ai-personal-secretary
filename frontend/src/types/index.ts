// User & Auth
export interface User {
    id?: string;
    email: string;
    name: string;
    picture?: string;
}

// Chat
export interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    // Added optional intent field to fix the error
    intent?: string; 
}

// Contacts
export interface Person {
    id: string;
    first_name: string;
    last_name: string;
    email?: string;
    phone?: string;
    company?: string;
    position?: string;
    description?: string;
    files?: string[];
    // Add other fields from database/Person model if needed (address, birthday, notes, url)
    address?: string;
    birthday?: string;
    notes?: string;
    url?: string;
}

// Files (Simple strings for now as per App.txt, or File objects for uploads)
// We mostly deal with knowledgeFiles as string implementation
export type KnowledgeFile = string;

// VCF Enrichment
export interface VcfContact {
    index: string; // or number, keeping consistent with backend
    vcf_name: string;
    vcf_email?: string;
    vcf_phone?: string;
    match_type: 'exact' | 'partial' | 'none';
    matched_contact_name?: string;
    matched_contact_company?: string;
}

export interface VcfMatchReport {
    total_vcf_contacts: number;
    exact_matches: number;
    partial_matches: number;
    no_matches: number;
    all_contacts: VcfContact[];
}

// Meeting / Calendar
export interface MeetingDetails {
    summary: string;
    start_time: string;
    end_time: string;
    description?: string;
    attendees?: string[];
}

// Shared UI Status
export interface UploadStatus {
    type: 'success' | 'error' | 'info';
    message: string;
}