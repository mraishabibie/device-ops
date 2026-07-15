"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  Search,
  Plus,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  AlertCircle,
  CheckCircle,
  Building,
  Activity,
  FolderOpen
} from "lucide-react";

interface DeviceRecord {
  id: string;
  device_name: string;
  serial_number: string;
  device_type: string;
  status: string;
  pairing_status: string;
  department: string | null;
  android_version: string | null;
  last_sync_at: string | null;
  created_at: string;
}

interface DeviceListResponse {
  items: DeviceRecord[];
  total: number;
  page: number;
  size: number;
}

export default function DevicesOverviewPage() {
  const { user } = useAuth();
  const [devices, setDevices] = useState<DeviceRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1 = Details, 2 = Hardware, 3 = Confirmation
  const [wizardName, setWizardName] = useState("");
  const [wizardType, setWizardType] = useState("PHONE");
  const [wizardDept, setWizardDept] = useState("");
  const [wizardSerial, setWizardSerial] = useState("");
  const [wizardError, setWizardError] = useState<string | null>(null); // error shown inside modal
  const [isRegistering, setIsRegistering] = useState(false);

  const isViewer = user?.role === "VIEWER";

  async function fetchDevices() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      let query = `/api/v1/devices/?page=${page}&size=5`;
      if (search) query += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) query += `&status_filter=${statusFilter}`;
      if (typeFilter) query += `&device_type=${typeFilter}`;
      
      const response = await apiFetch(query);
      if (response.ok) {
        const data: DeviceListResponse = await response.json();
        setDevices(data.items);
        setTotal(data.total);
      } else {
        setErrorMsg("Failed to retrieve device logs.");
      }
    } catch (err) {
      setErrorMsg("Failed to query backend api services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDevices();
  }, [page, search, statusFilter, typeFilter]);

  const handleRegisterDevice = async () => {
    if (isViewer) return;

    setWizardError(null);

    if (!wizardName.trim() || !wizardSerial.trim()) {
      setWizardError("Device Name and Serial Number are mandatory.");
      return;
    }

    try {
      setIsRegistering(true);
      const response = await apiFetch("/api/v1/devices/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_name: wizardName,
          serial_number: wizardSerial,
          device_type: wizardType,
          department: wizardDept || null,
        }),
      });

      if (response.ok) {
        // Close and reset wizard
        setIsWizardOpen(false);
        setWizardName("");
        setWizardSerial("");
        setWizardDept("");
        setWizardType("PHONE");
        setWizardStep(1);
        setWizardError(null);
        // Show page-level success and refresh list
        setSuccessMsg("Device registered successfully and set to PENDING_SYNC status.");
        fetchDevices();
      } else {
        const errData = await response.json().catch(() => ({ detail: "Registration failed" }));
        setWizardError(errData.detail || "Failed to register device.");
      }
    } catch (err) {
      setWizardError("Failed to connect to backend server.");
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Alert Banners */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700 max-w-4xl">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 max-w-4xl">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Toolbar and Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between max-w-7xl">
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
              <Search className="h-4 w-4" />
            </span>
            <input
              type="text"
              placeholder="Search by name or serial..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition text-zinc-900"
            />
          </div>

          {/* Filter Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
          >
            <option value="">All Statuses</option>
            <option value="ONLINE">ONLINE</option>
            <option value="OFFLINE">OFFLINE</option>
            <option value="PENDING_SYNC">PENDING_SYNC</option>
          </select>

          {/* Filter Type */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
          >
            <option value="">All Device Types</option>
            <option value="PHONE">PHONE</option>
            <option value="TABLET">TABLET</option>
          </select>
        </div>

        {!isViewer && (
          <Button
            onClick={() => {
              setWizardError(null);
              setIsWizardOpen(true);
            }}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="h-4 w-4" />
            Register Device
          </Button>
        )}
      </div>

      {/* Grid Table */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden max-w-7xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Device Name</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Serial Number</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Type</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Department</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Pairing Status</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Connectivity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500 text-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                    Loading devices list...
                  </td>
                </tr>
              ) : devices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-zinc-500 text-sm">
                    No active operational devices registered yet.
                  </td>
                </tr>
              ) : (
                devices.map((item) => (
                  <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                    <td className="p-4 text-sm font-semibold text-zinc-900">
                      <Link href={`/dashboard/devices/${item.id}`} className="hover:text-blue-600 transition-colors">
                        {item.device_name}
                      </Link>
                    </td>
                    <td className="p-4 text-sm text-zinc-600 font-mono text-xs">{item.serial_number}</td>
                    <td className="p-4 text-sm text-zinc-600">{item.device_type}</td>
                    <td className="p-4 text-sm text-zinc-600">{item.department || "-"}</td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        item.pairing_status === "PAIRED"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : item.pairing_status === "PAIRING"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-zinc-100 text-zinc-700 border-zinc-200"
                      }`}>
                        {item.pairing_status}
                      </span>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.status === "ONLINE"
                          ? "bg-green-100 text-green-800"
                          : item.status === "OFFLINE"
                          ? "bg-zinc-100 text-zinc-800"
                          : "bg-blue-100 text-blue-800"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {total > 0 && (
          <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Showing devices {((page - 1) * 5) + 1} to {Math.min(page * 5, total)} of {total}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                className="p-1.5 border border-zinc-200 rounded bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4 text-zinc-600" />
              </button>
              <button
                onClick={() => setPage((p) => (p * 5 < total ? p + 1 : p))}
                disabled={page * 5 >= total}
                className="p-1.5 border border-zinc-200 rounded bg-white hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 text-zinc-600" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* REGISTRATION WIZARD DIALOG */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-lg p-6 space-y-6">
            
            {/* Header / Wizard step indicator */}
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900">
                Register New Device
              </h3>
              <span className="text-xs text-zinc-400 font-semibold uppercase">
                Step {wizardStep} of 3
              </span>
            </div>

            {/* STEP 1: Details */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Device Name</label>
                  <input
                    type="text"
                    value={wizardName}
                    onChange={(e) => setWizardName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                    placeholder="Bridge Tablet 01"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Device Type</label>
                  <select
                    value={wizardType}
                    onChange={(e) => setWizardType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                  >
                    <option value="PHONE">PHONE</option>
                    <option value="TABLET">TABLET</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Department (Optional)</label>
                  <input
                    type="text"
                    value={wizardDept}
                    onChange={(e) => setWizardDept(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                    placeholder="Logistics"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsWizardOpen(false)}
                    className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!wizardName.trim()) {
                        setErrorMsg("Device Name is required.");
                      } else {
                        setErrorMsg(null);
                        setWizardStep(2);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: Hardware Details */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Hardware Serial Number</label>
                  <input
                    type="text"
                    value={wizardSerial}
                    onChange={(e) => setWizardSerial(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900 font-mono"
                    placeholder="SN-XXXXX-YYYYY"
                  />
                </div>

                <div className="flex justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(1)}
                    className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!wizardSerial.trim()) {
                        setErrorMsg("Serial Number is required.");
                      } else {
                        setErrorMsg(null);
                        setWizardStep(3);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg cursor-pointer"
                  >
                    Next Step
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: Confirmation Summary */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div className="bg-zinc-50 border border-zinc-100 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Device Name:</span>
                    <span className="text-zinc-900 font-bold">{wizardName}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Device Type:</span>
                    <span className="text-zinc-900 font-semibold">{wizardType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Serial Number:</span>
                    <span className="text-zinc-900 font-mono text-xs">{wizardSerial}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Department:</span>
                    <span className="text-zinc-900">{wizardDept || "None"}</span>
                  </div>
                </div>

                {/* Inline error shown inside the modal so user can see it without closing */}
                {wizardError && (
                  <div className="flex items-start gap-2 p-3 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{wizardError}</span>
                  </div>
                )}

                <div className="flex justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => setWizardStep(2)}
                    className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                    disabled={isRegistering}
                  >
                    Previous
                  </button>
                  <Button
                    type="button"
                    onClick={handleRegisterDevice}
                    disabled={isRegistering}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
                  >
                    {isRegistering && <Loader2 className="h-4 w-4 animate-spin" />}
                    Confirm & Register
                  </Button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
