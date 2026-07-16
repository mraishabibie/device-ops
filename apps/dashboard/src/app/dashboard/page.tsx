"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/AuthContext";
import { apiFetch } from "@/lib/api-client";
import {
  Smartphone,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  Search,
  Filter,
  RefreshCw,
  Loader2
} from "lucide-react";

interface DashboardStats {
  total_devices: number;
  online_devices: number;
  offline_devices: number;
  pending_sync_devices: number;
}

interface RecentActivityItem {
  id: string;
  device_name: string;
  action: string;
  timestamp: string;
}

interface LiveDeviceItem {
  id: string;
  device_name: string;
  serial_number: string;
  device_type: string;
  status: string;
  pairing_status: string;
  last_sync_at: string | null;
}

export default function DashboardOverviewPage() {
  const { user } = useAuth();
  
  // States
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<RecentActivityItem[]>([]);
  const [liveDevices, setLiveDevices] = useState<LiveDeviceItem[]>([]);
  const [companyTimezone, setCompanyTimezone] = useState("UTC");
  
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadDashboardData() {
    try {
      setLoading(true);
      setErrorMsg(null);

      // 1. Fetch company profile to retrieve configured timezone
      const compRes = await apiFetch("/api/v1/companies/me");
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanyTimezone(compData.timezone || "UTC");
      }

      // 2. Fetch statistics
      const statsRes = await apiFetch("/api/v1/dashboard/stats");
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Fetch recent activity logs
      const actRes = await apiFetch("/api/v1/dashboard/recent-activity");
      if (actRes.ok) {
        const actData = await actRes.json();
        setRecentActivities(actData.items);
      }

      // 4. Fetch live devices list
      const devRes = await apiFetch("/api/v1/devices/?size=10");
      if (devRes.ok) {
        const devData = await devRes.json();
        setLiveDevices(devData.items);
      }
    } catch (err) {
      setErrorMsg("Failed to query dashboard database logs.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Format date helper (enforcing company's configured timezone)
  const formatTimestamp = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("en-US", {
        timeZone: companyTimezone,
        dateStyle: "medium",
        timeStyle: "medium"
      }).format(date);
    } catch (e) {
      return dateStr;
    }
  };

  // Client-side quick filter on live devices table
  const filteredDevices = liveDevices.filter((item) => {
    const matchesSearch =
      item.device_name.toLowerCase().includes(search.toLowerCase()) ||
      item.serial_number.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter ? item.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      
      {/* Page Header */}
      <div className="flex justify-between items-center max-w-7xl">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Workspace Status</h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">
            Timestamps formatted in company timezone: <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/50">{companyTimezone}</span>
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 bg-white px-3.5 py-2 rounded-xl transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:shadow-sm cursor-pointer"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-slate-400" : "text-slate-500"}`} /> Reload Stats
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 text-sm rounded-xl bg-red-50 border border-red-200 text-red-700 max-w-4xl shadow-sm">
          {errorMsg}
        </div>
      )}

      {/* STATISTICS CARDS (Refinement: Calculated only from active devices) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-7xl">
        {/* Total Devices */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-blue-500 to-indigo-500" />
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Active</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-100 transition-colors">
              <Smartphone className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : stats?.total_devices ?? 0}
          </div>
        </div>

        {/* Online Devices */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Online</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <CheckCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : stats?.online_devices ?? 0}
          </div>
        </div>

        {/* Offline Devices */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-slate-400 to-slate-500" />
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Offline</span>
            <div className="p-2 bg-slate-50 text-slate-600 rounded-xl group-hover:bg-slate-100 transition-colors">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : stats?.offline_devices ?? 0}
          </div>
        </div>

        {/* Pending Sync Devices */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all duration-200 hover:-translate-y-0.5 space-y-3 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-violet-500 to-purple-500" />
          <div className="flex justify-between items-center text-slate-400">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Pending Sync</span>
            <div className="p-2 bg-violet-50 text-violet-600 rounded-xl group-hover:bg-violet-100 transition-colors">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-slate-900 font-sans tracking-tight">
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-slate-400" /> : stats?.pending_sync_devices ?? 0}
          </div>
        </div>
      </div>

      {/* Main content split panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl">
        
        {/* Live Device List Table */}
        <div className="xl:col-span-2 bg-white border border-slate-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-white flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-extrabold text-slate-900 text-sm">Operational Terminal List</h3>
            
            <div className="flex gap-2.5 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Filter name or serial..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition text-slate-900"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition text-slate-900 font-medium cursor-pointer"
              >
                <option value="">All Status</option>
                <option value="ONLINE">ONLINE</option>
                <option value="OFFLINE">OFFLINE</option>
                <option value="PENDING_SYNC">PENDING_SYNC</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto flex-grow">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Device Name</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Serial</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last handshake</th>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 text-xs">
                      <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" />
                      Loading live terminal feeds...
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-400 text-xs">
                      No operational devices match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="p-4 text-xs font-bold text-slate-900">
                        <Link href={`/dashboard/devices/${item.id}`} className="hover:text-blue-600 transition-colors">
                          {item.device_name}
                        </Link>
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-mono">{item.serial_number}</td>
                      <td className="p-4 text-xs text-slate-500">{formatTimestamp(item.last_sync_at)}</td>
                      <td className="p-4 text-xs">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border ${
                          item.status === "ONLINE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : item.status === "OFFLINE"
                            ? "bg-slate-50 text-slate-600 border-slate-200"
                            : "bg-blue-50 text-blue-700 border-blue-100"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.status === "ONLINE"
                              ? "bg-emerald-500"
                              : item.status === "OFFLINE"
                              ? "bg-slate-400"
                              : "bg-blue-500"
                          }`} />
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity List logs */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 bg-white flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-600 animate-pulse" /> Recent Telemetry Activity
            </h3>
          </div>
          
          <div className="p-5 flex-grow overflow-y-auto space-y-4 max-h-[380px] scrollbar-thin">
            {loading ? (
              <div className="text-center text-slate-400 text-xs py-12">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600 mx-auto mb-2" />
                Reading activity timeline...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center text-slate-400 text-xs py-12">
                No telemetry activity logs reported yet.
              </div>
            ) : (
              recentActivities.map((act) => {
                const isBattery = act.action.toLowerCase().includes("battery");
                const isNetwork = act.action.toLowerCase().includes("network");
                const dotColor = isBattery ? "bg-emerald-500 ring-emerald-100" : isNetwork ? "bg-blue-500 ring-blue-100" : "bg-purple-500 ring-purple-100";
                
                return (
                  <div key={act.id} className="text-xs space-y-1 relative border-l border-slate-100 pl-4.5 ml-2.5 pb-3">
                    <div className={`absolute -left-[4.5px] top-1.5 h-2 w-2 rounded-full ${dotColor} ring-4`} />
                    <div className="flex justify-between items-center text-slate-400 text-[9px]">
                      <span className="font-bold text-slate-800">{act.device_name}</span>
                      <span className="font-medium text-slate-400">{formatTimestamp(act.timestamp)}</span>
                    </div>
                    <p className="text-slate-600 leading-normal font-medium text-[11px]">{act.action}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
