"""
Document Loaders - Load and process various document formats

Handles:
- PDF (with OCR fallback for scanned documents)
- DOCX, TXT
- CSV, XLSX (with contact extraction)
- VCF files
- Images (JPG, PNG, etc.) with OCR

Uses Gemini Vision for OCR when needed.
"""

import os
import base64
import io
import PIL.Image
import fitz  # PyMuPDF for PDF processing
from typing import List, Optional
from dotenv import load_dotenv

from langchain_core.documents import Document
from langchain_community.document_loaders import PyPDFLoader, TextLoader, UnstructuredWordDocumentLoader, UnstructuredExcelLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage

from .contact_parsers import load_vcf_file, extract_contacts_from_csv

load_dotenv()


def load_documents(file_paths: List[str], gemini_key: Optional[str] = None) -> List[Document]:
    """Main document loader with multi-format support and OCR"""
    docs = []
    
    # Priority: User Provided Header Key -> Environment Variable
    active_gemini_key = gemini_key or os.getenv("GOOGLE_API_KEY")

    for file_path in file_paths:
        ext = os.path.splitext(file_path)[1].lower()
        filename = os.path.basename(file_path).lower()

        try:
            # Trigger specific parser for LinkedIn Connections
            if "connections.csv" in filename:
                from .contact_parsers import load_linkedin_connections
                print(f"⚡ parsing LinkedIn Connections: {filename}")
                docs.extend(load_linkedin_connections(file_path))

            elif ext == ".pdf":
                # Smart PDF Processing with OCR Fallback
                loader = PyPDFLoader(file_path)
                pdf_docs = loader.load()
                total_text_len = sum(len(d.page_content) for d in pdf_docs)
                
                if total_text_len > 100:
                    print(f"📄 Standard text PDF: {filename}")
                    docs.extend(pdf_docs)
                else:
                    # Scanned PDF detected, use Gemini Vision OCR
                    print(f"🔍 Scanned PDF detected: {filename} - Using OCR...")
                    pdf_document = fitz.open(file_path)
                    
                    for page_num in range(len(pdf_document)):
                        page = pdf_document.load_page(page_num)
                        pix = page.get_pixmap()
                        img_data = pix.tobytes("png")
                        img_base64 = base64.b64encode(img_data).decode()
                        
                        # Use Gemini Vision for OCR with prioritized key
                        if active_gemini_key:
                            llm = ChatGoogleGenerativeAI(
                                model="gemini-2.5-flash",
                                google_api_key=active_gemini_key
                            )
                            message = HumanMessage(
                                content=[
                                    {"type": "text", "text": "Transcribe all text from this document page exactly, preserving formatting where possible."},
                                    {"type": "image_url", "image_url": f"data:image/png;base64,{img_base64}"}
                                ]
                            )
                            response = llm.invoke([message])
                            doc = Document(
                                page_content=response.content,
                                metadata={"source": file_path, "page": page_num, "ocr": True}
                            )
                            docs.append(doc)
                            print(f"✅ OCR'd page {page_num + 1}/{len(pdf_document)}")
                        else:
                            print(f"⚠️ No valid Gemini API Key found - skipping OCR for page {page_num + 1}")
                    
                    pdf_document.close()
            
            elif ext == ".csv":
                # Try to extract contacts first
                contacts = extract_contacts_from_csv(file_path)
                if contacts:
                    for contact in contacts:
                        first = contact.get('first_name', '') or ''
                        last = contact.get('last_name', '') or ''
                        email = contact.get('email', '') or ''
                        phone = contact.get('phone', '') or ''
                        company = contact.get('company', '') or ''
                        position = contact.get('position', '') or ''
                        url = contact.get('url', '') or ''
                        
                        content = (
                            f"--- CONTACT CARD ---\n"
                            f"Name: {first} {last}\n"
                            f"Position: {position}\n"
                            f"Company: {company}\n"
                            f"Email: {email or 'Not available'}\n"
                            f"Phone: {phone or 'Not available'}\n"
                            f"URL: {url or 'Not available'}\n"
                            f"Source: {filename}\n"
                        )
                        
                        metadata = {
                            "source": file_path,
                            "type": "contact_card",
                            "person_name": f"{first} {last}",
                            "company": company or "",
                            "email": email or ""
                        }
                        
                        docs.append(Document(page_content=content, metadata=metadata))
                    
                    print(f"✅ Created {len(contacts)} contact cards from {filename}")
                else:
                    # Fallback: load as plain text
                    import csv as csv_module
                    encodings_to_try = ['utf-8-sig', 'utf-8', 'latin-1', 'cp1252']
                    content = None
                    for encoding in encodings_to_try:
                        try:
                            with open(file_path, "r", encoding=encoding, errors="replace") as f:
                                reader = csv_module.reader(f)
                                rows = [", ".join(row) for row in reader]
                            content = "\n".join(rows)
                            print(f"✅ Loaded CSV as text with encoding: {encoding}")
                            break
                        except UnicodeDecodeError:
                            continue
                    if content is None:
                        content = ""
                    if content.strip():
                        docs.append(Document(page_content=content, metadata={"source": file_path}))

            elif ext == ".txt":
                loader = TextLoader(file_path, encoding='utf-8')
                docs.extend(loader.load())
            
            elif ext == ".docx":
                try:
                    loader = UnstructuredWordDocumentLoader(file_path)
                    docs.extend(loader.load())
                    print(f"✅ Loaded DOCX file: {filename}")
                except Exception as e:
                    print(f"❌ Error loading DOCX {filename}: {e}")
            
            elif ext in [".xlsx", ".xls"]:
                try:
                    loader = UnstructuredExcelLoader(file_path)
                    docs.extend(loader.load())
                    print(f"✅ Loaded Excel file: {filename}")
                except Exception as e:
                    print(f"❌ Error loading Excel {filename}: {e}")
            
            elif ext == ".vcf":
                content = load_vcf_file(file_path)
                if content:
                    docs.append(Document(page_content=content, metadata={"source": file_path}))
            
            elif ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp']:
                # Direct Image OCR using Gemini Vision
                print(f"🖼️ Processing image with OCR: {filename}")
                try:
                    img = PIL.Image.open(file_path)
                    buffered = io.BytesIO()
                    img.save(buffered, format="PNG")
                    img_base64 = base64.b64encode(buffered.getvalue()).decode()
                    
                    if active_gemini_key:
                        llm = ChatGoogleGenerativeAI(
                            model="gemini-2.5-flash",
                            google_api_key=active_gemini_key
                        )
                        message = HumanMessage(
                            content=[
                                {"type": "text", "text": "Extract all visible text from this image. Include any text on signs, papers, screens, or documents visible in the image."},
                                {"type": "image_url", "image_url": f"data:image/png;base64,{img_base64}"}
                            ]
                        )
                        response = llm.invoke([message])
                        doc = Document(
                            page_content=response.content,
                            metadata={"source": file_path, "type": "image_ocr"}
                        )
                        docs.append(doc)
                        print(f"✅ OCR'd image: {filename}")
                    else:
                        print(f"⚠️ No valid Gemini API Key found - skipping image OCR")
                except Exception as img_error:
                    print(f"❌ Error processing image {filename}: {img_error}")
                    
        except Exception as e:
            print(f"Error loading {file_path}: {e}")
            
    return docs


def split_documents(docs: List[Document]) -> List[Document]:
    """Split documents into chunks for vectorization"""
    return RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(docs)