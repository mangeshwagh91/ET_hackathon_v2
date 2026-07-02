import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/client.js";
import LoadingSpinner from "../components/LoadingSpinner.jsx";
import SeverityBadge from "../components/SeverityBadge.jsx";
import EmptyState from "../components/EmptyState.jsx";

export default function Compliance() {
  const [specFile, setSpecFile] = useState(null);
  const [submFile, setSubmFile] = useState(null);
  const [vendorName, setVendorName] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [equipmentItemId, setEquipmentItemId] = useState("eq-ups-moda-001");
  const [equipmentList, setEquipmentList] = useState([]);
  const [uploadingSpec, setUploadingSpec] = useState(false);
  const [uploadingSubm, setUploadingSubm] = useState(false);
  const [runningCheck, setRunningCheck] = useState(false);
  const [specStatus, setSpecStatus] = useState("");
  const [submStatus, setSubmStatus] = useState("");
  const [checkStatus, setCheckStatus] = useState("");
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);
  const [selectedDev, setSelectedDev] = useState(null);
  const [currentPoId, setCurrentPoId] = useState("po-ps1500-001");
  const navigate = useNavigate();
  const specInputRef = useRef();
  const submInputRef = useRef();

  useEffect(() => {
    api
      .getEquipmentItems()
      .then((data) => setEquipmentList(data.equipment_items || []))
      .catch(() => {});
  }, []);

  async function handleSpecUpload() {
    if (!specFile) return;
    const formData = new FormData();
    formData.append("file", specFile);
    try {
      setUploadingSpec(true);
      setError(null);
      setSpecStatus("Extracting text and parsing clauses via LLM...");
      const data = await api.uploadSpecification(formData);
      setSpecStatus(
        `✓ Specification ready — ${data.clauses_extracted} clauses extracted`,
      );
    } catch (err) {
      setError(`Spec upload failed: ${err.message}`);
      setSpecStatus("");
    } finally {
      setUploadingSpec(false);
    }
  }

  async function handleSubmittalUpload() {
    if (!submFile) {
      setError("Select a submittal PDF first");
      return;
    }
    if (!vendorName.trim()) {
      setError("Enter vendor name");
      return;
    }
    if (!poNumber.trim()) {
      setError("Enter PO number");
      return;
    }
    const formData = new FormData();
    formData.append("file", submFile);
    formData.append("vendor_name", vendorName.trim());
    formData.append("po_number", poNumber.trim());
    formData.append("equipment_item_id", equipmentItemId);
    try {
      setUploadingSubm(true);
      setError(null);
      setSubmStatus("Extracting submittal attributes via LLM...");
      const data = await api.uploadSubmittal(formData);
      setCurrentPoId(data.po_id);
      setSubmStatus(
        `✓ Submittal ready — ${data.attributes_extracted} attributes extracted | PO: ${data.po_id.slice(0, 8)}...`,
      );
    } catch (err) {
      setError(`Submittal upload failed: ${err.message}`);
      setSubmStatus("");
    } finally {
      setUploadingSubm(false);
    }
  }

  async function handleRunCheck() {
    try {
      setRunningCheck(true);
      setError(null);
      setSelectedDev(null);
      setCheckStatus(
        "Spec Compliance Agent running — calling LLM for severity classification...",
      );
      const data = await api.runComplianceCheck(currentPoId);
      setResults(data);
      setCheckStatus(`✓ Done — ${data.summary?.total || 0} deviations found`);
    } catch (err) {
      setError(`Compliance check failed: ${err.message}`);
      setCheckStatus("");
    } finally {
      setRunningCheck(false);
    }
  }

  const sevColor = {
    CRITICAL: "bg-red-50 hover:bg-red-100 border-l-4 border-red-500",
    MAJOR: "bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400",
    MINOR: "bg-amber-50 hover:bg-amber-100 border-l-4 border-amber-400",
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">
        Specification Compliance
      </h1>
      <div className="flex gap-6">
        {/* ── Left panel ── */}
        <div className="w-80 flex-shrink-0 space-y-4">
          {/* Spec upload */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-700 mb-3">
              1. Specification PDF
            </h2>
            <input
              ref={specInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setSpecFile(e.target.files[0])}
              className="block w-full text-sm text-slate-500
                file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0
                file:text-sm file:bg-slate-100 file:text-slate-700
                hover:file:bg-slate-200 cursor-pointer"
            />
            {specFile && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                {specFile.name}
              </p>
            )}
            <button
              onClick={handleSpecUpload}
              disabled={!specFile || uploadingSpec}
              className="mt-3 w-full bg-slate-700 hover:bg-slate-800
                disabled:bg-slate-300 disabled:cursor-not-allowed
                text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {uploadingSpec
                ? "Uploading & Parsing..."
                : "Upload Specification"}
            </button>
            {specStatus && (
              <p
                className={`mt-2 text-xs ${specStatus.startsWith("✓") ? "text-green-700" : "text-blue-700"}`}
              >
                {specStatus}
              </p>
            )}
          </div>

          {/* Submittal upload */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-700 mb-3">
              2. Vendor Submittal PDF
            </h2>
            <input
              ref={submInputRef}
              type="file"
              accept=".pdf"
              onChange={(e) => setSubmFile(e.target.files[0])}
              className="block w-full text-sm text-slate-500
                file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0
                file:text-sm file:bg-slate-100 file:text-slate-700
                hover:file:bg-slate-200 cursor-pointer"
            />
            {submFile && (
              <p className="text-xs text-slate-500 mt-1 truncate">
                {submFile.name}
              </p>
            )}
            <input
              type="text"
              placeholder="Vendor name *"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-1.5
                text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <input
              type="text"
              placeholder="PO number *"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-1.5
                text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <select
              value={equipmentItemId}
              onChange={(e) => setEquipmentItemId(e.target.value)}
              className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-1.5
                text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            >
              {equipmentList.length === 0 ? (
                <option value="eq-ups-moda-001">
                  EQ-UPS-MODA-001 (default)
                </option>
              ) : (
                equipmentList.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.item_code} — {eq.description?.slice(0, 35)}
                  </option>
                ))
              )}
            </select>
            <button
              onClick={handleSubmittalUpload}
              disabled={!submFile || uploadingSubm}
              className="mt-3 w-full bg-slate-700 hover:bg-slate-800
                disabled:bg-slate-300 disabled:cursor-not-allowed
                text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
            >
              {uploadingSubm ? "Uploading & Extracting..." : "Upload Submittal"}
            </button>
            {submStatus && (
              <p
                className={`mt-2 text-xs ${submStatus.startsWith("✓") ? "text-green-700" : "text-blue-700"}`}
              >
                {submStatus}
              </p>
            )}
          </div>

          {/* Run check */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
            <h2 className="font-semibold text-slate-700 mb-2">
              3. Run Compliance Check
            </h2>
            <p className="text-xs text-slate-400 mb-1">Purchase Order:</p>
            <code className="text-xs bg-slate-100 px-2 py-1 rounded block truncate mb-3">
              {currentPoId}
            </code>
            <button
              onClick={handleRunCheck}
              disabled={runningCheck}
              className="w-full bg-teal-600 hover:bg-teal-700
                disabled:bg-teal-300 disabled:cursor-not-allowed
                text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
            >
              {runningCheck ? "Agent Running..." : "⚡ Run Compliance Check"}
            </button>
            {checkStatus && (
              <p
                className={`mt-2 text-xs ${checkStatus.startsWith("✓") ? "text-green-700" : "text-blue-700"}`}
              >
                {checkStatus}
              </p>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-400 hover:text-red-600"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {runningCheck ? (
            <LoadingSpinner message="Spec Compliance Agent running — LLM classifying deviations..." />
          ) : results ? (
            <>
              {/* Summary */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge
                      severity={
                        results.compliance_status === "COMPLIANT"
                          ? "PASS"
                          : "CRITICAL"
                      }
                    />
                    <span className="font-semibold text-slate-700">
                      {results.vendor_name || "Vendor"} ·{" "}
                      {results.po_number || currentPoId.slice(0, 8)}
                    </span>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <span className="text-red-600 font-bold">
                      {results.summary?.critical || 0} CRITICAL
                    </span>
                    <span className="text-orange-500 font-bold">
                      {results.summary?.major || 0} MAJOR
                    </span>
                    <span className="text-amber-600 font-bold">
                      {results.summary?.minor || 0} MINOR
                    </span>
                  </div>
                </div>
              </div>

              {/* Deviations table */}
              {results.deviations && results.deviations.length > 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">
                          Attribute
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">
                          Specified
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">
                          Submitted
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">
                          Delta
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">
                          Severity
                        </th>
                        <th className="text-left px-4 py-3 font-semibold text-slate-600">
                          NCR
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {results.deviations.map((dev) => (
                        <tr
                          key={dev.id}
                          onClick={() =>
                            setSelectedDev(
                              selectedDev?.id === dev.id ? null : dev,
                            )
                          }
                          className={`cursor-pointer transition-colors ${
                            sevColor[dev.severity] || "hover:bg-slate-50"
                          }`}
                        >
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">
                            {(dev.attribute_name || "").replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-3 text-green-700 font-medium">
                            {dev.specified_value}
                          </td>
                          <td className="px-4 py-3 text-red-700 font-medium">
                            {dev.submitted_value}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {dev.deviation_pct != null
                              ? `${dev.deviation_pct.toFixed(1)}%`
                              : "Mismatch"}
                          </td>
                          <td className="px-4 py-3">
                            <SeverityBadge severity={dev.severity} />
                          </td>
                          <td className="px-4 py-3">
                            {dev.ncr_id && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/ncr/${dev.ncr_id}`);
                                }}
                                className="text-teal-600 hover:text-teal-800 text-xs underline font-medium"
                              >
                                View NCR →
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
                  <p className="text-green-700 font-semibold text-lg">
                    ✓ All requirements compliant
                  </p>
                  <p className="text-green-600 text-sm mt-1">
                    No deviations detected in this submittal
                  </p>
                </div>
              )}

              {/* Deviation detail slide-in */}
              {selectedDev && (
                <div className="bg-slate-800 text-white rounded-xl shadow-lg p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <SeverityBadge severity={selectedDev.severity} />
                      <h3 className="font-semibold text-lg mt-2">
                        {(selectedDev.attribute_name || "")
                          .replace(/_/g, " ")
                          .toUpperCase()}
                      </h3>
                    </div>
                    <button
                      onClick={() => setSelectedDev(null)}
                      className="text-slate-400 hover:text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                    <div className="bg-slate-700 rounded p-3">
                      <div className="text-slate-400 text-xs mb-1">
                        Specified
                      </div>
                      <div className="font-bold text-green-400">
                        {selectedDev.specified_value}
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded p-3">
                      <div className="text-slate-400 text-xs mb-1">
                        Submitted
                      </div>
                      <div className="font-bold text-red-400">
                        {selectedDev.submitted_value}
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded p-3">
                      <div className="text-slate-400 text-xs mb-1">Clause</div>
                      <div className="text-slate-200 text-xs">
                        {selectedDev.clause_number || "N/A"}
                      </div>
                    </div>
                    <div className="bg-slate-700 rounded p-3">
                      <div className="text-slate-400 text-xs mb-1">
                        w_conform
                      </div>
                      <div className="text-slate-200">
                        {((selectedDev.w_conform || 0) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {selectedDev.justification && (
                    <div className="text-slate-300 text-sm mb-3 leading-relaxed">
                      {selectedDev.justification}
                    </div>
                  )}

                  {selectedDev.recommended_action && (
                    <div className="bg-slate-700 rounded p-3 text-sm mb-3">
                      <span className="text-slate-400 font-semibold">
                        Recommended Action:{" "}
                      </span>
                      <span className="text-slate-200">
                        {selectedDev.recommended_action}
                      </span>
                    </div>
                  )}

                  {selectedDev.ncr_id && (
                    <button
                      onClick={() => navigate(`/ncr/${selectedDev.ncr_id}`)}
                      className="text-teal-400 hover:text-teal-200 text-sm underline font-medium"
                    >
                      View Full NCR Detail →
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-64">
              <EmptyState
                title="No compliance results yet"
                description="Upload a specification PDF and vendor submittal PDF, then click Run Compliance Check"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
