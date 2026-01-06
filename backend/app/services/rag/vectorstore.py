"""
Vectorstore - Core Pinecone operations

Handles:
- Setting up Pinecone index
- Indexing documents to vectorstore
- Deleting documents from vectorstore
"""

import os
from typing import List
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_pinecone import PineconeVectorStore
from langchain_huggingface import HuggingFaceEmbeddings
from pinecone import Pinecone, ServerlessSpec
from app.core.config import normalize_path_for_filter

load_dotenv()


def setup_pinecone_vectorstore(chunks: List[Document], namespace: str) -> bool:
    """Index document chunks to Pinecone vectorstore"""
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        raise ValueError("PINECONE_API_KEY missing in .env")

    pc = Pinecone(api_key=api_key)
    index_name = "ai-secretary"

    existing_indexes = [i.name for i in pc.list_indexes()]
    if index_name not in existing_indexes:
        pc.create_index(
            name=index_name,
            dimension=768,
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region="us-east-1")
        )

    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-mpnet-base-v2")
    
    batch_size = 20
    print(f"DEBUG: Processing {len(chunks)} chunks with Local Embeddings...")
    
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        if not batch: 
            continue
        PineconeVectorStore.from_documents(batch, embeddings, index_name=index_name, namespace=namespace)
        print(f"Processed batch {i} to {i+batch_size}")
        
    return True


def delete_document(user_id: str, filename: str) -> bool:
    """Delete a specific document from vectorstore"""
    api_key = os.getenv("PINECONE_API_KEY")
    pc = Pinecone(api_key=api_key)
    index = pc.Index("ai-secretary")
    try:
        # Use normalized path (forward slashes) for cross-platform compatibility
        normalized_path = normalize_path_for_filter(user_id, filename)
        index.delete(filter={"source": {"$eq": normalized_path}}, namespace=user_id)
        return True
    except Exception as e:
        print(f"Error deleting: {e}")
        return False

