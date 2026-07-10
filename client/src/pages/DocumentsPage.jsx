import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, CheckCircle, Clock, Trash2, ArrowRight, ShieldAlert } from "lucide-react";
import api from "../api/client.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import { useWorkspace } from "../context/WorkspaceContext.jsx";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { currentProject } = useWorkspace();
  
  // Upload States
  const [file, setFile] = useState(null);
  const [docType, setDocType] = useState("specification"); // "specification" | "submittal" | "general"
  const [uploadStatus, setUploadStatus] = useState("");
  const [filter, setFilter] = useState("All");
  
  // Submittal Extra Fields
  const [vendorName, setVendorName] = useState("");
  const [poNumber, setPoNumber] = useState("");

  useEffect(() => {
    if (currentProject) {
      fetchDocuments();
    }
  }, [currentProject]);

  const fetchDocuments = async () => {
    if (!currentProject) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getDocuments(currentProject.id);
      setDocuments(data.documents || []);
    } catch (err) {
      setError(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Please select a file to upload");
      return;
    }
    
    setError(null);
    setUploadStatus("Uploading file...");
    const formData = new FormData();
    formData.append("file", file);
    if (currentProject) {
      formData.append("project_id", currentProject.id);
    }

    try {
      let result;
      if (docType === "specification") {
        result = await api.uploadSpecification(formData);
      } else if (docType === "submittal") {
        if (!vendorName || !poNumber) {
          setError("Vendor Name and PO Number are required for submittal uploads");
          setUploadStatus("");
          return;
        }
        formData.append("vendor_name", vendorName);
        formData.append("po_number", poNumber);
        result = await api.uploadSubmittal(formData);
      } else {
        // general upload
        formData.append("doc_type", "general");
        result = await api.uploadGeneral(formData);
      }
      
      if (result.status === "processing") {
        setUploadStatus("File uploaded. Background AI parsing in progress...");
        await api.pollUntilReady(result.document_id, (statusInfo) => {
          setUploadStatus(`Processing: ${statusInfo.queue_status || statusInfo.status}...`);
        });
      }

      setUploadStatus("File uploaded and ingested successfully!");
      setFile(null);
      setVendorName("");
      setPoNumber("");
      fetchDocuments();
    } catch (err) {
      setError(err.message || "Failed to upload document");
      setUploadStatus("");
    }
  };

  const handleDelete = async (docId) => {
    if (!confirm("Are you sure you want to delete this document? All associated records will be removed.")) return;
    setError(null);
    try {
      await api.deleteDocument(docId);
      fetchDocuments();
    } catch (err) {
      setError(err.message || "Failed to delete document");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-8 text-slate-800 min-h-screen">
      {/* Header */}
      <div className="mb-8 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Project Documents</h1>
        <p className="text-slate-500 text-sm mt-1">Incorporate specifications, vendor submittals, and delay notices to train and update your project intelligence agents.</p>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-red-50 border border-red-200 text-red-650 rounded-xl mb-6 text-xs font-semibold"
        >
          {error}
        </motion.div>
      )}

      {uploadStatus && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl mb-6 text-xs font-semibold"
        >
          {uploadStatus}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Upload Panel */}
        <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-850 flex items-center gap-2">
            <Upload size={18} className="text-emerald-500" />
            Upload Document
          </h2>

          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Document Type</label>
              <select
                value={docType}
                onChange={(e) => {
                  setDocType(e.target.value);
                  setError(null);
                  setUploadStatus("");
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="specification">Specification (PDF)</option>
                <option value="submittal">Vendor Submittal (PDF)</option>
                <option value="general">Delay Notice / Drawings (PDF)</option>
              </select>
            </div>

            {docType === "submittal" && (
              <>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Vendor Name</label>
                  <input
                    type="text"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Vertiv"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">PO Number</label>
                  <input
                    type="text"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder="e.g. PO-2026-001"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 transition-colors placeholder-slate-400"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Select PDF File</label>
              <div 
                className={`relative border-2 border-dashed rounded-2xl bg-slate-50/30 transition-colors flex flex-col items-center justify-center p-8 text-center group cursor-pointer overflow-hidden ${file ? 'border-emerald-500/50' : 'border-slate-250 hover:border-emerald-500/40'}`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    setFile(e.dataTransfer.files[0]);
                  }
                }}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload size={20} className={file ? "text-emerald-500" : "text-slate-500"} />
                </div>
                
                {file ? (
                  <>
                    <span className="text-sm font-semibold text-emerald-400 truncate w-full max-w-[200px]">{file.name}</span>
                    <span className="text-xs text-slate-500 mt-1">Ready to upload</span>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-semibold text-slate-300">Drag & Drop PDF</span>
                    <span className="text-xs text-slate-500 mt-1">or click to browse</span>
                  </>
                )}
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-900 font-extrabold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/10 mt-6"
            >
              <span>Ingest Document</span>
              <ArrowRight size={14} className="text-slate-900" />
            </motion.button>
          </form>
        </div>

        {/* Right: Document List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText size={18} className="text-emerald-500" />
              Ingested Documents ({documents.length})
            </h2>
            <div className="flex bg-slate-50 border border-slate-200 rounded-lg p-1">
              {["All", "Specification", "Submittal", "General"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilter(type)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${filter === type ? 'bg-white text-emerald-600 border border-slate-200 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <LoadingSpinner message="Fetching document log..." />
          ) : documents.length === 0 ? (
            <div className="text-center py-16 bg-white border border-slate-200 rounded-3xl shadow-sm">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-slate-800 font-bold text-sm">No Documents Ingested</h3>
              <p className="text-slate-500 text-xs mt-1">Upload files using the panel on the left to index project details.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.filter(doc => filter === "All" || doc.doc_type === filter.toLowerCase()).map(doc => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-slate-200 p-4 rounded-xl flex items-center justify-between gap-4 hover:border-slate-300 transition-colors shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                      <FileText size={20} className="text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-850 truncate max-w-[200px] sm:max-w-md">{doc.filename}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{doc.doc_type}</span>
                        <span className="text-[10px] text-slate-450">{doc.upload_ts?.slice(0, 10)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border flex items-center gap-1 ${
                      doc.status === 'ready' 
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-700' 
                        : doc.status === 'processing'
                        ? 'bg-blue-50 border-blue-200 text-blue-650'
                        : 'bg-red-50 border-red-200 text-red-650'
                    }`}>
                      {doc.status === 'ready' ? <CheckCircle size={10} /> : <Clock size={10} />}
                      {doc.status}
                    </span>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 bg-slate-50 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200 hover:border-red-250 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
