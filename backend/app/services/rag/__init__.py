"""
RAG module - Document indexing and semantic search

This module provides organized access to RAG functionality:
- Contact parsing from various formats (VCF, CSV, XLSX)
- Document loading with OCR support
- Vector store operations (Pinecone)
- Contact indexing and management
- RAG-based query answering

Usage:
    from app.services.rag import query_rag, load_documents, index_person_to_vectorstore
    from app.services.rag import get_chat_model  # Multi-provider LLM support
"""

# Import from modular files
from .contact_parsers import (
    load_vcf_file,
    load_linkedin_connections,
    extract_contacts_from_csv,
    extract_contacts_from_xlsx,
)

from .document_loaders import (
    load_documents,
    split_documents,
)

from .vectorstore import (
    setup_pinecone_vectorstore,
    delete_document,
)

from .contact_indexing import (
    create_contact_card_document,
    index_person_to_vectorstore,
    delete_person_from_vectorstore,
    delete_persons_batch_from_vectorstore,
)

from .query_engine import (
    query_rag,
)

from .llm_providers import (
    get_chat_model,
)

# Define public API
__all__ = [
    # Contact parsers
    "load_vcf_file",
    "load_linkedin_connections",
    "extract_contacts_from_csv",
    "extract_contacts_from_xlsx",
    
    # Document loaders
    "load_documents",
    "split_documents",
    
    # Vectorstore
    "setup_pinecone_vectorstore",
    "delete_document",
    
    # Contact indexing
    "create_contact_card_document",
    "index_person_to_vectorstore",
    "delete_person_from_vectorstore",
    "delete_persons_batch_from_vectorstore",
    
    # Query
    "query_rag",
    
    # LLM providers
    "get_chat_model",
]
