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
          <h2 className="text-xl font-bold text-zinc-950">Workspace Status</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Timestamps formatted in company timezone: <span className="font-semibold text-zinc-700">{companyTimezone}</span>
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-900 border border-zinc-200 bg-white px-3 py-1.5 rounded-lg transition-colors cursor-pointer font-medium"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Reload Stats
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700 max-w-4xl">
          {errorMsg}
        </div>
      )}

      {/* STATISTICS CARDS (Refinement: Calculated only from active devices) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-7xl">
        {/* Total Devices */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Active</span>
            <Smartphone className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-zinc-400" /> : stats?.total_devices ?? 0}
          </div>
        </div>

        {/* Online Devices */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between text-green-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Online</span>
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-zinc-400" /> : stats?.online_devices ?? 0}
          </div>
        </div>

        {/* Offline Devices */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between text-zinc-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Offline</span>
            <XCircle className="h-5 w-5 text-zinc-400" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-zinc-400" /> : stats?.offline_devices ?? 0}
          </div>
        </div>

        {/* Pending Sync Devices */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm space-y-2">
          <div className="flex justify-between text-blue-500">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Pending Sync</span>
            <Clock className="h-5 w-5" />
          </div>
          <div className="text-2xl font-bold text-zinc-900">
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-zinc-400" /> : stats?.pending_sync_devices ?? 0}
          </div>
        </div>
      </div>

      {/* Main content split panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl">
        
        {/* Live Device List Table */}
        <div className="xl:col-span-2 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h3 className="font-bold text-zinc-950 text-sm">Operational Terminal List</h3>
            
            <div className="flex gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
                  <Search className="h-3.5 w-3.5" />
                </span>
                <input
                  type="text"
                  placeholder="Filter name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded outline-none focus:border-blue-600 transition text-zinc-900"
                />
              </div>

              {/* Status filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-zinc-200 rounded outline-none focus:border-blue-600 text-zinc-900"
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
                <tr className="bg-zinc-50 border-b border-zinc-200">
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Device Name</th>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Serial</th>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Last handshake</th>
                  <th className="p-3 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500 text-xs">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600 mx-auto mb-2" />
                      Loading live terminal feeds...
                    </td>
                  </tr>
                ) : filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-zinc-500 text-xs">
                      No operational devices match criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map((item) => (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-3 text-xs font-semibold text-zinc-900">
                        <Link href={`/dashboard/devices/${item.id}`} className="hover:text-blue-600 transition-colors">
                          {item.device_name}
                        </Link>
                      </td>
                      <td className="p-3 text-xs text-zinc-500 font-mono">{item.serial_number}</td>
                      <td className="p-3 text-xs text-zinc-600">{formatTimestamp(item.last_sync_at)}</td>
                      <td className="p-3 text-xs">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === "ONLINE"
                            ? "bg-green-50 text-green-700"
                            : item.status === "OFFLINE"
                            ? "bg-zinc-100 text-zinc-700"
                            : "bg-blue-50 text-blue-700"
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
        </div>

        {/* Recent Activity List logs */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
            <h3 className="font-bold text-zinc-950 text-sm flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-600" /> Recent Telemetry Activity
            </h3>
          </div>
          
          <div className="p-4 flex-grow overflow-y-auto space-y-4 max-h-[360px]">
            {loading ? (
              <div className="text-center text-zinc-500 text-xs py-12">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 mx-auto mb-2" />
                Reading activity timeline...
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center text-zinc-400 text-xs py-12">
                No telemetry activity logs reported yet.
              </div>
            ) : (
              recentActivities.map((act) => (
                <div key={act.id} className="text-xs space-y-1 relative border-l-2 border-zinc-100 pl-4 ml-2 pb-2">
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-zinc-300" />
                  <div className="flex justify-between items-center text-zinc-400 text-[10px]">
                    <span className="font-bold text-zinc-700">{act.device_name}</span>
                    <span>{formatTimestamp(act.timestamp)}</span>
                  </div>
                  <p className="text-zinc-600 leading-normal">{act.action}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
