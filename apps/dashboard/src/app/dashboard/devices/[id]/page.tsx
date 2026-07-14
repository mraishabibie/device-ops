"use client";

import React, { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/features/auth/context/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  ChevronLeft,
  Calendar,
  Layers,
  Activity,
  Trash2,
  Lock,
  Unlock,
  AlertTriangle,
  Loader2,
  CheckCircle,
  AlertCircle,
  MapPin,
  Battery,
  Wifi,
  ChevronLeftCircle,
  ChevronRightCircle
} from "lucide-react";

// Types
interface DeviceDetail {
  id: string;
  device_name: string;
  serial_number: string;
  device_type: string;
  status: string;
  pairing_status: string;
  department: string | null;
  android_version: string | null;
  app_version: string | null;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

interface GPSLog {
  id: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  recorded_at: string;
}

interface BatteryLog {
  id: string;
  battery_level: number;
  charging: boolean;
  recorded_at: string;
}

interface NetworkLog {
  id: string;
  network_type: string;
  is_online: boolean;
  recorded_at: string;
}

export default function DeviceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const deviceId = params.id as string;

  const mapContainerRef = useRef<HTMLDivElement | null>(null);

  // States
  const [device, setDevice] = useState<DeviceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [companyTimezone, setCompanyTimezone] = useState("UTC");

  // History lists & pagination states (Device history pages must support pagination)
  const [gpsLogs, setGpsLogs] = useState<GPSLog[]>([]);
  const [gpsPage, setGpsPage] = useState(1);
  const [gpsTotal, setGpsTotal] = useState(0);

  const [batteryLogs, setBatteryLogs] = useState<BatteryLog[]>([]);
  const [batteryPage, setBatteryPage] = useState(1);
  const [batteryTotal, setBatteryTotal] = useState(0);

  const [networkLogs, setNetworkLogs] = useState<NetworkLog[]>([]);
  const [networkPage, setNetworkPage] = useState(1);
  const [networkTotal, setNetworkTotal] = useState(0);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isViewer = user?.role === "VIEWER";

  // 1. Fetch core device detail parameters
  async function loadDevice() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const response = await apiFetch(`/api/v1/devices/${deviceId}`);
      if (response.ok) {
        const data: DeviceDetail = await response.json();
        setDevice(data);
      } else {
        setErrorMsg("Device not found or has been decommissioned.");
      }
    } catch (err) {
      setErrorMsg("Failed to query device details.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Fetch company workspace details to retrieve configured timezone
  async function loadTimezone() {
    try {
      const compRes = await apiFetch("/api/v1/companies/me");
      if (compRes.ok) {
        const compData = await compRes.json();
        setCompanyTimezone(compData.timezone || "UTC");
      }
    } catch (e) {
      // Fail silently
    }
  }

  // 3. Fetch paginated histories
  async function fetchGPSHistory() {
    if (!deviceId) return;
    try {
      const res = await apiFetch(`/api/v1/devices/${deviceId}/gps-history?page=${gpsPage}&size=5`);
      if (res.ok) {
        const data = await res.json();
        setGpsLogs(data.items);
        setGpsTotal(data.total);
      }
    } catch (e) {}
  }

  async function fetchBatteryHistory() {
    if (!deviceId) return;
    try {
      const res = await apiFetch(`/api/v1/devices/${deviceId}/battery-history?page=${batteryPage}&size=5`);
      if (res.ok) {
        const data = await res.json();
        setBatteryLogs(data.items);
        setBatteryTotal(data.total);
      }
    } catch (e) {}
  }

  async function fetchNetworkHistory() {
    if (!deviceId) return;
    try {
      const res = await apiFetch(`/api/v1/devices/${deviceId}/network-history?page=${networkPage}&size=5`);
      if (res.ok) {
        const data = await res.json();
        setNetworkLogs(data.items);
        setNetworkTotal(data.total);
      }
    } catch (e) {}
  }

  // Load device on mount
  useEffect(() => {
    if (deviceId) {
      loadDevice();
      loadTimezone();
    }
  }, [deviceId]);

  // Sync history updates
  useEffect(() => {
    fetchGPSHistory();
  }, [deviceId, gpsPage]);

  useEffect(() => {
    fetchBatteryHistory();
  }, [deviceId, batteryPage]);

  useEffect(() => {
    fetchNetworkHistory();
  }, [deviceId, networkPage]);

  // 4. MapLibre Integration Map Visualizer
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current || !device) return;
    
    // Find latest valid GPS coordinates (latitude or longitude != 0)
    const validGps = gpsLogs.find((l) => l.latitude !== 0.0 || l.longitude !== 0.0);
    if (!validGps) return;

    // Load maplibre-gl stylesheet dynamically to keep html headers clean
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/maplibre-gl@4.0.0/dist/maplibre-gl.css";
    document.head.appendChild(link);

    let map: any;

    import("maplibre-gl").then((maplibregl) => {
      if (!mapContainerRef.current) return;

      map = new maplibregl.default.Map({
        container: mapContainerRef.current,
        style: "https://demotiles.maplibre.org/style.json",
        center: [validGps.longitude, validGps.latitude],
        zoom: 13
      });

      // Map marker color matches status configurations (ONLINE green, OFFLINE gray, PENDING_SYNC blue)
      const markerColor =
        device.status === "ONLINE"
          ? "#10B981"
          : device.status === "OFFLINE"
          ? "#6B7280"
          : "#3B82F6";

      new maplibregl.default.Marker({ color: markerColor })
        .setLngLat([validGps.longitude, validGps.latitude])
        .addTo(map);
    });

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, [gpsLogs, device]);

  // Format date using company timezone settings
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

  const handleDecommission = async () => {
    if (isViewer) return;

    try {
      setIsDeleting(true);
      setErrorMsg(null);
      
      const response = await apiFetch(`/api/v1/devices/${deviceId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setSuccessMsg("Device decommissioned successfully. Redirecting...");
        setIsConfirmOpen(false);
        setTimeout(() => {
          router.push("/dashboard/devices");
        }, 1500);
      } else {
        const errData = await response.json().catch(() => ({ detail: "Decommission failed" }));
        setErrorMsg(errData.detail || "Failed to decommission device.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-white border border-zinc-200 rounded-xl shadow-sm max-w-4xl mx-auto mt-6">
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-zinc-500 font-medium">Fetching device telemetry history...</p>
        </div>
      </div>
    );
  }

  if (!device) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm text-center max-w-xl mx-auto mt-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900">Device Profile Inaccessible</h2>
        <p className="text-sm text-zinc-500">
          The requested device record is missing or has been decommissioned from the workspace.
        </p>
        <Link href="/dashboard/devices" className="inline-block text-sm text-blue-600 font-semibold hover:underline">
          &larr; Back to Device List
        </Link>
      </div>
    );
  }

  const latestLocation = gpsLogs.find((l) => l.latitude !== 0.0 || l.longitude !== 0.0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Back link */}
      <div className="flex items-center">
        <Link href="/dashboard/devices" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> Back to Devices
        </Link>
      </div>

      {/* Alert banners */}
      {successMsg && (
        <div className="flex items-center gap-3 p-4 text-sm rounded-lg bg-green-50 border border-green-200 text-green-700">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <div>{successMsg}</div>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 p-4 text-sm rounded-lg bg-red-50 border border-red-200 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <div>{errorMsg}</div>
        </div>
      )}

      {/* Device Header Widget */}
      <div className="bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-600">
            <Smartphone className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-zinc-900">{device.device_name}</h2>
            <p className="text-xs text-zinc-500 font-mono mt-0.5">
              Serial: {device.serial_number} | Timezone: {companyTimezone}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {device.pairing_status !== "PAIRED" && !isViewer && (
            <Link href={`/dashboard/devices/${device.id}/pair`}>
              <span className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm">
                Pair Device
              </span>
            </Link>
          )}
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
            device.pairing_status === "PAIRED"
              ? "bg-green-50 text-green-700 border-green-200"
              : device.pairing_status === "PAIRING"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-zinc-100 text-zinc-700 border-zinc-200"
          }`}>
            {device.pairing_status}
          </span>
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
            device.status === "ONLINE"
              ? "bg-green-100 text-green-800"
              : device.status === "OFFLINE"
              ? "bg-zinc-100 text-zinc-800"
              : "bg-blue-100 text-blue-800"
          }`}>
            {device.status}
          </span>
        </div>
      </div>

      {/* MAP & GPS MONITOR PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Mapbox Maplibre container */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col min-h-[350px]">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
            <h3 className="font-bold text-zinc-950 text-sm flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-blue-600" /> Geographic Tracker (MapLibre GL)
            </h3>
            {latestLocation && (
              <span className="text-[10px] text-zinc-500 font-mono">
                Lat: {latestLocation.latitude.toFixed(5)}, Lon: {latestLocation.longitude.toFixed(5)}
              </span>
            )}
          </div>
          
          <div className="flex-grow relative bg-zinc-50">
            {latestLocation ? (
              <div id="map-container" ref={mapContainerRef} className="absolute inset-0 w-full h-full" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-xs">
                No location telemetry signals reported yet.
              </div>
            )}
          </div>
        </div>

        {/* GPS Location History Timeline */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
            <h3 className="font-bold text-zinc-950 text-sm">GPS History</h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => setGpsPage((p) => Math.max(p - 1, 1))}
                disabled={gpsPage === 1}
                className="disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeftCircle className="h-4 w-4 text-zinc-500" />
              </button>
              <button
                onClick={() => setGpsPage((p) => (p * 5 < gpsTotal ? p + 1 : p))}
                disabled={gpsPage * 5 >= gpsTotal}
                className="disabled:opacity-40 cursor-pointer"
              >
                <ChevronRightCircle className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>

          <div className="p-4 flex-grow overflow-y-auto space-y-3">
            {gpsLogs.length === 0 ? (
              <p className="text-center text-zinc-400 text-xs py-12">No coordinate logs.</p>
            ) : (
              gpsLogs.map((log) => (
                <div key={log.id} className="text-xs bg-zinc-50 border border-zinc-100 rounded-lg p-2.5 flex justify-between items-center">
                  <div>
                    <span className="font-semibold text-zinc-800 font-mono">
                      {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
                    </span>
                    <span className="text-[10px] text-zinc-400 block mt-0.5">Accuracy: {log.accuracy ? `${log.accuracy}m` : "Unknown"}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{formatTimestamp(log.recorded_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* BATTERY & NETWORK TELEMETRY PANEL */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Battery Log History List */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
            <h3 className="font-bold text-zinc-950 text-sm flex items-center gap-1.5">
              <Battery className="h-4 w-4 text-emerald-600" /> Battery Charge Logs
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => setBatteryPage((p) => Math.max(p - 1, 1))}
                disabled={batteryPage === 1}
                className="disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeftCircle className="h-4 w-4 text-zinc-500" />
              </button>
              <button
                onClick={() => setBatteryPage((p) => (p * 5 < batteryTotal ? p + 1 : p))}
                disabled={batteryPage * 5 >= batteryTotal}
                className="disabled:opacity-40 cursor-pointer"
              >
                <ChevronRightCircle className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {batteryLogs.length === 0 ? (
              <p className="text-center text-zinc-400 text-xs py-12">No battery logs.</p>
            ) : (
              batteryLogs.map((log) => (
                <div key={log.id} className="text-xs border border-zinc-100 rounded-lg p-2.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${
                      log.battery_level > 50 ? "bg-green-500" : log.battery_level > 20 ? "bg-amber-500" : "bg-red-500"
                    }`} />
                    <span className="font-semibold text-zinc-800">{log.battery_level}%</span>
                    {log.charging && <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded">Charging</span>}
                  </div>
                  <span className="text-[10px] text-zinc-500">{formatTimestamp(log.recorded_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Network status History List */}
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-zinc-200 bg-zinc-50/50 flex justify-between items-center">
            <h3 className="font-bold text-zinc-950 text-sm flex items-center gap-1.5">
              <Wifi className="h-4 w-4 text-blue-600" /> Network Status Logs
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => setNetworkPage((p) => Math.max(p - 1, 1))}
                disabled={networkPage === 1}
                className="disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeftCircle className="h-4 w-4 text-zinc-500" />
              </button>
              <button
                onClick={() => setNetworkPage((p) => (p * 5 < networkTotal ? p + 1 : p))}
                disabled={networkPage * 5 >= networkTotal}
                className="disabled:opacity-40 cursor-pointer"
              >
                <ChevronRightCircle className="h-4 w-4 text-zinc-500" />
              </button>
            </div>
          </div>

          <div className="p-4 space-y-3">
            {networkLogs.length === 0 ? (
              <p className="text-center text-zinc-400 text-xs py-12">No network logs.</p>
            ) : (
              networkLogs.map((log) => (
                <div key={log.id} className="text-xs border border-zinc-100 rounded-lg p-2.5 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${log.is_online ? "bg-green-500" : "bg-red-500"}`} />
                    <span className="font-semibold text-zinc-800">{log.network_type}</span>
                    <span className="text-[10px] text-zinc-400">{log.is_online ? "Connected" : "Disconnected"}</span>
                  </div>
                  <span className="text-[10px] text-zinc-500">{formatTimestamp(log.recorded_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Danger Zone */}
      {!isViewer && (
        <div className="bg-red-50/30 border border-red-200/50 rounded-xl p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h4 className="font-bold text-red-900 text-sm">Danger Zone</h4>
            <p className="text-xs text-zinc-500 mt-1">
              Decommissioning this device will set its status to offline, unpair it, and prevent future telemetry synchronization.
            </p>
          </div>
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer text-sm"
          >
            Decommission Device
          </button>
        </div>
      )}

      {/* CONFIRMATION DECOMMISSION MODAL */}
      {isConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex items-center gap-3 text-red-600">
              <AlertTriangle className="h-6 w-6 shrink-0 animate-bounce" />
              <h3 className="text-lg font-bold">Decommission Device?</h3>
            </div>
            
            <p className="text-sm text-zinc-600 leading-relaxed">
              Are you sure you want to decommission <span className="font-bold text-zinc-900">{device.device_name}</span>? 
              This will perform a soft-delete: the device will be unlinked, offline, and rejected from all active dashboard lists and telemetry ports.
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setIsConfirmOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDecommission}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
              >
                {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Decommission
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
