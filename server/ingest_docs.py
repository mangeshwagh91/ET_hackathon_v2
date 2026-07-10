import os
import fitz  # PyMuPDF
from langchain_text_splitters import RecursiveCharacterTextSplitter
import sys

# Ensure server path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.vector_store import index_standard

DOCS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs")

def process_pdfs():
    if not os.path.exists(DOCS_DIR):
        print(f"Docs directory not found: {DOCS_DIR}")
        return

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )

    for filename in os.listdir(DOCS_DIR):
        if filename.lower().endswith(".pdf"):
            filepath = os.path.join(DOCS_DIR, filename)
            print(f"Processing {filename}...")
            
            try:
                doc = fitz.open(filepath)
                full_text = ""
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    full_text += page.get_text()
                
                chunks = text_splitter.split_text(full_text)
                print(f"  -> Extracted {len(chunks)} chunks.")
                
                success_count = 0
                for i, chunk in enumerate(chunks):
                    chunk = chunk.strip()
                    if not chunk:
                        continue
                    
                    standard_id = f"{filename}_chunk_{i}"
                    metadata = {
                        "source": filename,
                        "chunk_index": i,
                        "type": "standard_doc"
                    }
                    if index_standard(standard_id, chunk, metadata):
                        success_count += 1
                        
                print(f"  -> Indexed {success_count}/{len(chunks)} chunks into ChromaDB.")
            except Exception as e:
                print(f"Error processing {filename}: {e}")

if __name__ == "__main__":
    process_pdfs()
