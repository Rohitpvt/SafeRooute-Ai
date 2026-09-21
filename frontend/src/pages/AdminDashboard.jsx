import React, { useEffect, useState } from "react";
import apiClient from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard"); // "dashboard" | "users" | "datasets" | "system"

  // Summary Metrics
  const [summary, setSummary] = useState({
    total_users: 0,
    active_users: 0,
    total_predictions: 0,
    average_risk: 0,
    high_risk_count: 0,
    critical_risk_count: 0,
    average_prediction_confidence: 0,
    model_version: "1.0.0",
    dataset_version: "1.0",
  });

  // User manager states
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Dataset states
  const [datasets, setDatasets] = useState([]);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  // System stats states
  const [systemStats, setSystemStats] = useState({
    uptime_seconds: 0,
    cpu_percentage: 0,
    memory_percentage: 0,
    memory_used_gb: 0,
    memory_total_gb: 0,
  });

  // Retraining status
  const [retraining, setRetraining] = useState(false);
  const [candidateModel, setCandidateModel] = useState(null);
  const [promoting, setPromoting] = useState(false);

  // Toast / Confirmation Dialog states
  const [toast, setToast] = useState(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch dashboard summaries
  const fetchSummary = async () => {
    try {
      const response = await apiClient.get("/admin/dashboard");
      if (response.success && response.data) {
        setSummary(response.data);
      }
    } catch (err) {
      console.error("Failed to load dashboard summaries:", err);
      showToast("Error loading analytics summaries", "error");
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  // 2. Fetch User list
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const url = searchQuery ? `/admin/users?search=${searchQuery}` : "/admin/users";
      const response = await apiClient.get(url);
      if (response.success && response.data) {
        setUsers(response.data.records);
      }
    } catch (err) {
      console.error("Failed to load users:", err);
      showToast("Failed to retrieve user list", "error");
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab, searchQuery]);

  // 3. Fetch Datasets
  const fetchDatasets = async () => {
    try {
      const response = await apiClient.get("/admin/datasets");
      if (response.success && response.data) {
        setDatasets(response.data.records);
      }
    } catch (err) {
      console.error("Failed to load datasets:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "datasets") {
      fetchDatasets();
    }
  }, [activeTab]);

  // 4. Fetch System status
  const fetchSystemStats = async () => {
    try {
      const response = await apiClient.get("/admin/system/stats");
      if (response.success && response.data) {
        setSystemStats(response.data);
      }
    } catch (err) {
      console.error("Failed to load system telemetry:", err);
    }
  };

  useEffect(() => {
    if (activeTab === "system") {
      fetchSystemStats();
      const interval = setInterval(fetchSystemStats, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  // Toggle user activation account status
  const handleToggleStatus = async (userId, currentStatus) => {
    try {
      const nextStatus = !currentStatus;
      const response = await apiClient.patch(`/admin/users/${userId}/status?is_active=${nextStatus}`);
      if (response.success) {
        showToast("User activation state modified successfully.");
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to modify user status.", "error");
    }
  };

  // Toggle user permission role
  const handleChangeRole = async (userId, nextRole) => {
    try {
      const response = await apiClient.patch(`/admin/users/${userId}/role?role=${nextRole}`);
      if (response.success) {
        showToast("User role upgraded successfully.");
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to update user role.", "error");
    }
  };

  // Perform soft-delete
  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      const response = await apiClient.delete(`/admin/users/${confirmDeleteUser}`);
      if (response.success) {
        showToast("User account successfully soft-deleted.");
        setConfirmDeleteUser(null);
        fetchUsers();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Failed to delete user.", "error");
      setConfirmDeleteUser(null);
    }
  };

  // File Upload handler
  const handleUploadFile = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      // Axios call passing multipart-form headers
      const response = await apiClient.post("/admin/datasets/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.success) {
        showToast("Dataset successfully uploaded and validated.");
        setUploadFile(null);
        fetchDatasets();
        fetchSummary();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Dataset validation failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  // Model retraining handler
  const handleTriggerRetrain = async () => {
    setRetraining(true);
    setCandidateModel(null);
    try {
      const response = await apiClient.post("/admin/model/retrain");
      if (response.success && response.data) {
        setCandidateModel(response.data);
        showToast("Retraining pipeline completed. Candidate generated.");
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Retraining pipeline failed.", "error");
    } finally {
      setRetraining(false);
    }
  };

  // Model promotion handler
  const handlePromoteModel = async () => {
    if (!candidateModel) return;
    setPromoting(true);
    try {
      const response = await apiClient.post(`/admin/model/promote?candidate_version=${candidateModel.model_version}`);
      if (response.success) {
        showToast(`Model successfully upgraded to version ${candidateModel.model_version}.`);
        setCandidateModel(null);
        fetchSummary();
      }
    } catch (err) {
      showToast(err.response?.data?.detail || "Promotion failed.", "error");
    } finally {
      setPromoting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col font-sans">
      
      {/* 1. Admin header navigation bar */}
      <header className="border-b border-white/10 bg-[#0F0F0F]/80 backdrop-blur-xl px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-2xl bg-[#F97316] flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-[#F97316]/30 font-display">
            SR
          </span>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight font-display">SafeRoute <span className="font-serif italic font-normal text-[#F97316]">AI</span> Admin Portal</span>
            <span className="text-[10px] text-slate-500 font-mono tracking-wider">SYSTEM MANAGEMENT & MODELLING</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.location.href = "/dashboard"}
            className="bg-white/5 border border-white/10 hover:border-white/20 text-xs px-4 py-2 rounded-full font-semibold transition text-slate-300 font-sans"
          >
            Commuter Dashboard
          </button>
          <button
            onClick={logout}
            className="bg-white/5 border border-white/10 hover:border-white/20 text-xs px-4 py-2 rounded-full font-semibold transition text-red-400 font-sans"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main body split layouts */}
      <div className="flex flex-grow max-w-7xl mx-auto w-full p-6 gap-6 flex-col md:flex-row">
        
        {/* Tab sidebars navigation controls */}
        <aside className="w-full md:w-64 flex flex-col gap-2">
          {[
            { id: "dashboard", label: "Dashboard Analytics", icon: "📊" },
            { id: "users", label: "User Accounts", icon: "👥" },
            { id: "datasets", label: "Dataset Management", icon: "📁" },
            { id: "system", label: "System Telemetry", icon: "⚙️" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-left text-xs font-semibold tracking-wider uppercase transition font-display ${
                activeTab === tab.id
                  ? "bg-[#F97316] text-white shadow-lg shadow-[#F97316]/20"
                  : "bg-[#0F0F0F] hover:bg-white/5 text-slate-400 border border-white/10"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Tab displays panel container */}
        <main className="flex-grow flex flex-col gap-6">
          
          {/* TAB 1: DASHBOARD SUMMARY PANELS */}
          {activeTab === "dashboard" && (
            <div className="flex flex-col gap-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { title: "Total Registered Users", value: summary.total_users, subtitle: `${summary.active_users} active accounts` },
                  { title: "Model Status Version", value: `v${summary.model_version}`, subtitle: `Dataset version v${summary.dataset_version}` },
                  { title: "Total Prediction Runs", value: summary.total_predictions, subtitle: `Confidence: ${(summary.average_prediction_confidence * 100).toFixed(1)}%` },
                  { title: "API Risk Ratios", value: `${summary.average_risk}%`, subtitle: `${summary.critical_risk_count} critical warnings` },
                ].map((card, idx) => (
                  <div key={idx} className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-5 flex flex-col justify-between backdrop-blur-xl">
                    <div>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block mb-1 font-sans">{card.title}</span>
                      <span className="text-2xl font-bold tracking-tight text-white font-mono">{card.value}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-2 block font-mono">{card.subtitle}</span>
                  </div>
                ))}
              </div>

              {/* Simple HTML/CSS Analytics Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl">
                  <h3 className="text-sm font-bold tracking-tight border-b border-white/10 pb-3 font-display">Assessed Risk Distribution</h3>
                  <div className="flex flex-col gap-4 py-2">
                    {[
                      { label: "Low Risk (0-25)", count: summary.total_predictions - summary.high_risk_count - summary.critical_risk_count, color: "bg-emerald-500" },
                      { label: "High Risk (51-75)", count: summary.high_risk_count, color: "bg-[#F97316]" },
                      { label: "Critical Risk (76-100)", count: summary.critical_risk_count, color: "bg-red-600" },
                    ].map((item, i) => {
                      const pct = summary.total_predictions > 0 ? (item.count / summary.total_predictions) * 100 : 0;
                      return (
                        <div key={i} className="flex flex-col gap-1.5 text-xs font-sans">
                          <div className="flex justify-between font-semibold">
                            <span className="text-slate-300">{item.label}</span>
                            <span className="text-white font-mono">{item.count} ({pct.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                            <div className={`h-full ${item.color}`} style={{ width: `${pct}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT TABLE */}
          {activeTab === "users" && (
            <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
                <h3 className="text-md font-bold tracking-tight font-display">System User Directory</h3>
                <input
                  type="text"
                  placeholder="Search by full name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-[#F97316] w-64 text-slate-200 font-mono"
                />
              </div>

              {usersLoading ? (
                <div className="text-center py-8 text-xs text-slate-500 font-mono">
                  Loading user directories...
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-slate-500 font-mono text-xs border border-dashed border-white/10 rounded-2xl">
                  No registered users match your query.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left font-sans">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-500 uppercase tracking-wider text-[10px]">
                        <th className="py-3 px-2">Name</th>
                        <th className="px-2">Email</th>
                        <th className="px-2">Role Permission</th>
                        <th className="px-2">Status</th>
                        <th className="text-right px-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-3 px-2 font-semibold text-slate-200">{u.full_name}</td>
                          <td className="px-2 text-slate-400 font-mono">{u.email}</td>
                          <td className="px-2">
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u.id, e.target.value)}
                              className="bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1 focus:border-[#F97316] outline-none text-slate-300 font-mono"
                            >
                              <option value="USER">User</option>
                              <option value="ADMIN">Admin</option>
                            </select>
                          </td>
                          <td className="px-2">
                            <button
                              onClick={() => handleToggleStatus(u.id, u.is_active)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border font-mono ${
                                u.is_active
                                  ? "bg-emerald-950/60 border-emerald-500/40 text-emerald-400"
                                  : "bg-red-950/60 border-red-500/40 text-red-400"
                              }`}
                            >
                              {u.is_active ? "Active" : "Inactive"}
                            </button>
                          </td>
                          <td className="text-right px-2">
                            <button
                              onClick={() => setConfirmDeleteUser(u.id)}
                              className="text-xs text-red-400 hover:text-red-300 font-semibold"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DATASETS MANAGEMENT PANEL */}
          {activeTab === "datasets" && (
            <div className="flex flex-col gap-6">
              
              {/* CSV Upload form card */}
              <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl">
                <h3 className="text-sm font-bold border-b border-white/10 pb-3 font-display">Upload Accident Training CSV</h3>
                <form onSubmit={handleUploadFile} className="flex flex-col sm:flex-row gap-3 items-center font-sans">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="text-xs text-slate-400 bg-white/5 border border-white/10 p-2.5 rounded-xl w-full cursor-pointer font-mono"
                  />
                  <button
                    type="submit"
                    disabled={uploading || !uploadFile}
                    className="bg-[#F97316] hover:bg-[#FB923C] text-white rounded-full px-6 py-3 text-xs font-bold tracking-wider uppercase w-full sm:w-auto transition disabled:opacity-40 font-display shadow-lg shadow-[#F97316]/20"
                  >
                    {uploading ? "Uploading..." : "Upload & Validate"}
                  </button>
                </form>
              </div>

              {/* Uploads history */}
              <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl">
                <h3 className="text-sm font-bold border-b border-white/10 pb-3 font-display">Uploaded Dataset Directory</h3>
                {datasets.length === 0 ? (
                  <div className="text-center py-6 text-slate-500 font-mono text-xs border border-dashed border-white/10 rounded-2xl">
                    No dataset configurations found.
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {datasets.map((d) => (
                      <div key={d.dataset_id} className="p-4 bg-black/40 border border-white/10 rounded-2xl flex items-center justify-between text-xs font-sans">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-200 font-mono">{d.filename}</span>
                          <span className="text-[10px] text-slate-400 font-mono flex gap-3">
                            <span>Rows: {d.row_count}</span>
                            <span>•</span>
                            <span>Version: {d.dataset_version}</span>
                            <span>•</span>
                            <span>Missing cells: {d.missing_percentage.toFixed(2)}%</span>
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono truncate max-w-md">SHA-256: {d.checksum}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(d.uploaded_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM MONITOR & PIPELINE RETRAINING CONTROLS */}
          {activeTab === "system" && (
            <div className="flex flex-col gap-6">
              
              {/* Telemetry rows */}
              <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl">
                <h3 className="text-sm font-bold border-b border-white/10 pb-3 font-display">Hardware Telemetry</h3>
                <div className="grid grid-cols-3 gap-4 text-center font-sans">
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/10 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">CPU Usage</span>
                    <span className="text-2xl font-bold font-mono text-[#F97316]">{systemStats.cpu_percentage}%</span>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/10 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Memory Allocation</span>
                    <span className="text-2xl font-bold font-mono text-emerald-400">{systemStats.memory_percentage}%</span>
                    <span className="text-[9px] text-slate-500 font-mono">{systemStats.memory_used_gb} / {systemStats.memory_total_gb} GB</span>
                  </div>
                  <div className="p-4 bg-black/40 rounded-2xl border border-white/10 flex flex-col gap-1">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">API Uptime</span>
                    <span className="text-sm font-bold font-mono text-amber-400">
                      {Math.floor(systemStats.uptime_seconds / 3600)}h {Math.floor((systemStats.uptime_seconds % 3600) / 60)}m
                    </span>
                  </div>
                </div>
              </div>

              {/* Retraining model promote panel */}
              <div className="bg-[#0F0F0F] border border-white/10 rounded-3xl p-6 flex flex-col gap-4 backdrop-blur-xl">
                <h3 className="text-sm font-bold border-b border-white/10 pb-3 font-display">Model Retraining & Swap Operations</h3>
                <div className="flex flex-col gap-4 font-sans">
                  <div className="flex gap-4">
                    <button
                      onClick={handleTriggerRetrain}
                      disabled={retraining}
                      className="bg-[#F97316] hover:bg-[#FB923C] text-white rounded-full px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition disabled:opacity-40 font-display shadow-lg shadow-[#F97316]/20"
                    >
                      {retraining ? "Executing Retraining..." : "Trigger Model Retraining"}
                    </button>
                  </div>

                  {candidateModel && (
                    <div className="bg-black/40 border border-white/10 p-5 rounded-2xl flex flex-col gap-3 text-xs">
                      <h4 className="font-bold text-[#F97316] font-display">Candidate Evaluation Results (Model version {candidateModel.model_version})</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px] text-slate-400">
                        <div>Accuracy: {candidateModel.evaluation_metrics.accuracy}</div>
                        <div>Precision: {candidateModel.evaluation_metrics.precision}</div>
                        <div>Recall: {candidateModel.evaluation_metrics.recall}</div>
                        <div>F1-Score: {candidateModel.evaluation_metrics.f1_score}</div>
                      </div>
                      
                      <div className="flex gap-2.5 mt-2">
                        <button
                          onClick={handlePromoteModel}
                          disabled={promoting}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-full px-5 py-2 text-xs font-bold transition font-display uppercase tracking-wider"
                        >
                          {promoting ? "Promoting Model..." : "Promote to Production"}
                        </button>
                        <button
                          onClick={() => setCandidateModel(null)}
                          className="bg-white/5 border border-white/10 hover:bg-white/10 rounded-full px-5 py-2 text-xs text-slate-400 transition"
                        >
                          Discard Candidate
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Confirmation Dialog Modal overlay */}
      {confirmDeleteUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur flex items-center justify-center p-4">
          <div className="bg-[#0F0F0F] border border-white/10 p-6 rounded-3xl max-w-sm w-full flex flex-col gap-4 text-white font-sans">
            <h4 className="text-md font-bold font-display">Confirm account deletion?</h4>
            <p className="text-xs text-slate-400 font-sans">This will soft delete the user account and revoke authorization permissions. This action is destructive.</p>
            <div className="flex gap-3 justify-end text-xs">
              <button
                onClick={() => setConfirmDeleteUser(null)}
                className="bg-white/5 border border-white/10 px-4 py-2 rounded-full text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded-full text-white font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global alert toast notification widget */}
      {toast && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-2xl shadow-xl text-white border text-xs font-semibold font-sans ${
          toast.type === "success"
            ? "bg-emerald-950 border-emerald-500/40 text-emerald-400"
            : "bg-red-950 border-red-500/40 text-red-400"
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
