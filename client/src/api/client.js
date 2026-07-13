// Allow overriding the API base during development via Vite env var VITE_API_BASE
// Example: VITE_API_BASE=http://localhost:8000/api
const BASE = import.meta.env.VITE_API_BASE || "/api";

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = data.detail || data.error || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }
  return response.json();
}

const api = {
  getDashboardSummary: async () => {
    const res = await fetch(`${BASE}/dashboard/summary`);
    return handleResponse(res);
  },

  uploadSpecification: async (formData) => {
    const res = await fetch(`${BASE}/upload/specification`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  uploadSubmittal: async (formData) => {
    const res = await fetch(`${BASE}/upload/submittal`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  getDocumentStatus: async (docId) => {
    const res = await fetch(`${BASE}/upload/status/${docId}`);
    return handleResponse(res);
  },

  pollUntilReady: async (docId, onProgress, maxAttempts = 30) => {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const poll = async () => {
        try {
          const res = await api.getDocumentStatus(docId);
          if (onProgress) onProgress(res);
          if (res.status === "ready") {
            resolve(res);
          } else if (res.status === "failed") {
            reject(new Error(res.error || "Processing failed"));
          } else if (attempts >= maxAttempts) {
            reject(new Error("Processing timeout"));
          } else {
            attempts++;
            setTimeout(poll, 2000); // 2 second interval
          }
        } catch (error) {
          reject(error);
        }
      };
      poll();
    });
  },

  getDocuments: async (projectId) => {
    const query = projectId ? `?project_id=${projectId}` : "";
    const res = await fetch(`${BASE}/upload/documents${query}`);
    return handleResponse(res);
  },

  deleteDocument: async (docId) => {
    const res = await fetch(`${BASE}/upload/document/${docId}`, {
      method: "DELETE",
    });
    return handleResponse(res);
  },

  getEquipmentItems: async () => {
    const res = await fetch(`${BASE}/upload/equipment`);
    return handleResponse(res);
  },

  runComplianceCheck: async (poId) => {
    const res = await fetch(`${BASE}/compliance/run/${poId}`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  getComplianceResults: async (poId) => {
    const res = await fetch(`${BASE}/compliance/results/${poId}`);
    return handleResponse(res);
  },

  getNcrs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.severity) params.set("severity", filters.severity);
    if (filters.status) params.set("status", filters.status);
    const query = params.toString();
    const res = await fetch(
      `${BASE}/compliance/ncrs${query ? "?" + query : ""}`,
    );
    return handleResponse(res);
  },

  getNcrDetail: async (ncrId) => {
    const res = await fetch(`${BASE}/compliance/ncr/${ncrId}`);
    return handleResponse(res);
  },

  importSchedule: async (formData) => {
    const res = await fetch(`${BASE}/schedule/import`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  analyzeSchedule: async () => {
    const res = await fetch(`${BASE}/schedule/analyze`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  getScheduleTasks: async () => {
    const res = await fetch(`${BASE}/schedule/tasks`);
    return handleResponse(res);
  },

  getScheduleRisks: async () => {
    const res = await fetch(`${BASE}/schedule/risks`);
    return handleResponse(res);
  },

  queryRFI: async (query) => {
    const res = await fetch(`${BASE}/rfi/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    return handleResponse(res);
  },

  getRFIs: async () => {
    const res = await fetch(`${BASE}/rfi/rfis`);
    return handleResponse(res);
  },

  getPurchaseOrders: async () => {
    const res = await fetch(`${BASE}/dashboard/summary`);
    const data = await handleResponse(res);
    return data.purchase_orders || [];
  },

  // Projects Endpoints
  getProjects: async () => {
    const res = await fetch(`${BASE}/projects/`);
    return handleResponse(res);
  },

  createProject: async (projectData) => {
    const res = await fetch(`${BASE}/projects/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(projectData),
    });
    return handleResponse(res);
  },

  updateProjectStatus: async (projectId, status) => {
    const res = await fetch(`${BASE}/projects/${projectId}/status?status=${status}`, {
      method: "PATCH",
    });
    return handleResponse(res);
  },

  getOpenProjects: async () => {
    const res = await fetch(`${BASE}/projects/open`);
    return handleResponse(res);
  },

  // Auth & Vendor Registration Endpoints
  registerVendor: async (vendorData) => {
    const res = await fetch(`${BASE}/auth/register/vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(vendorData),
    });
    return handleResponse(res);
  },

  loginVendor: async (email, password) => {
    const res = await fetch(`${BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return handleResponse(res);
  },

  // Bids Endpoints
  createBid: async (bidData) => {
    const res = await fetch(`${BASE}/bids/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bidData),
    });
    return handleResponse(res);
  },

  getBids: async (projectId) => {
    const res = await fetch(`${BASE}/bids/${projectId}`);
    return handleResponse(res);
  },

  updateBidStatus: async (bidId, status) => {
    const res = await fetch(`${BASE}/bids/update_status/${bidId}?status=${status}`, {
      method: "PATCH",
    });
    return handleResponse(res);
  },

  getBidRecommendations: async (projectId) => {
    const res = await fetch(`${BASE}/bids/recommend?project_id=${projectId}`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  uploadGeneral: async (formData) => {
    const res = await fetch(`${BASE}/upload/general`, {
      method: "POST",
      body: formData,
    });
    return handleResponse(res);
  },

  // Commissioning Copilot
  getCommissioningTasks: async () => {
    const res = await fetch(`${BASE}/commissioning/tasks`);
    return handleResponse(res);
  },

  generateCommissioningChecklist: async (taskId) => {
    const res = await fetch(`${BASE}/commissioning/checklist/generate/${taskId}`, {
      method: "POST",
    });
    return handleResponse(res);
  },

  runCommissioningStep: async (taskId, stepNumber, actualValue, checkedBy = "QA Engineer") => {
    const res = await fetch(`${BASE}/commissioning/run/${taskId}/step/${stepNumber}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actual_value: actualValue, checked_by: checkedBy }),
    });
    return handleResponse(res);
  },

  getCommissioningRecords: async () => {
    const res = await fetch(`${BASE}/commissioning/records`);
    return handleResponse(res);
  },

  // Supply Chain Visibility
  getSupplyChainShipments: async () => {
    const res = await fetch(`${BASE}/supply-chain/shipments`);
    return handleResponse(res);
  },

  getSupplyChainAlerts: async () => {
    const res = await fetch(`${BASE}/supply-chain/alerts`);
    return handleResponse(res);
  },

  getSupplyChainMap: async () => {
    const res = await fetch(`${BASE}/supply-chain/map`);
    return handleResponse(res);
  },

  triggerSupplyChainShock: async (payload) => {
    const res = await fetch(`${BASE}/orchestrator/trigger-shock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  triggerSupplyChainShockLangGraph: async (payload) => {
    const res = await fetch(`${BASE}/orchestrator/trigger-langgraph`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    return handleResponse(res);
  },

  // Schedule Delay Comparison
  getDelayComparison: async () => {
    const res = await fetch(`${BASE}/schedule/delay-comparison`);
    return handleResponse(res);
  },
};

export default api;
