"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Smartphone,
  ChevronLeft,
  QrCode,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock
} from "lucide-react";

interface DeviceStatus {
  id: string;
  device_name: string;
  serial_number: string;
  pairing_status: string;
}

interface PairingTokenData {
  id: string;
  token: string;
  expires_at: string;
}

const getApiUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL && !process.env.NEXT_PUBLIC_API_URL.includes("localhost:8000")) {
    const url = process.env.NEXT_PUBLIC_API_URL;
    return url.endsWith("/") ? url : `${url}/`;
  }
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    if (hostname.includes("splineproject.com")) {
      return "https://api.splineproject.com/";
    }
  }
  const defaultUrl = process.env.NEXT_PUBLIC_API_URL || "https://api.splineproject.com/";
  return defaultUrl.endsWith("/") ? defaultUrl : `${defaultUrl}/`;
};

export default function DevicePairPage() {
  const params = useParams();
  const router = useRouter();
  const deviceId = params.id as string;

  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [tokenData, setTokenData] = useState<PairingTokenData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function loadPairingContext() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      // Load device profile details
      const devRes = await apiFetch(`/api/v1/devices/${deviceId}`);
      if (!devRes.ok) {
        setErrorMsg("Device not found or has been decommissioned.");
        setLoading(false);
        return;
      }
      const devData: DeviceStatus = await devRes.json();
      setDevice(devData);

      if (devData.pairing_status === "PAIRED") {
        setSuccess(true);
        setLoading(false);
        return;
      }

      // Generate a one-time pairing token
      const tokenRes = await apiFetch(`/api/v1/devices/${deviceId}/pair-token`, {
        method: "POST",
      });

      if (tokenRes.ok) {
        const tData: PairingTokenData = await tokenRes.json();
        setTokenData(tData);
      } else {
        const errData = await tokenRes.json().catch(() => ({ detail: "Token generation failed" }));
        setErrorMsg(errData.detail || "Failed to generate a pairing token.");
      }
    } catch (err) {
      setErrorMsg("Failed to query backend api services.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (deviceId) {
      loadPairingContext();
    }
  }, [deviceId]);

  // Checks pairing status via polling
  const handleCheckStatus = async () => {
    if (!deviceId) return;
    try {
      setIsPolling(true);
      setErrorMsg(null);
      
      const response = await apiFetch(`/api/v1/devices/${deviceId}`);
      if (response.ok) {
        const data: DeviceStatus = await response.json();
        setDevice(data);
        if (data.pairing_status === "PAIRED") {
          setSuccess(true);
          setTimeout(() => {
            router.push(`/dashboard/devices/${deviceId}`);
          }, 1500);
        } else {
          setErrorMsg("Device is not paired yet. Please verify agent has scanned the token.");
        }
      } else {
        setErrorMsg("Failed to verify pairing status.");
      }
    } catch (err) {
      setErrorMsg("Connection failure.");
    } finally {
      setIsPolling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center bg-white border border-zinc-200 rounded-xl shadow-sm max-w-lg mx-auto mt-12">
        <div className="text-center space-y-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-zinc-500 font-medium">Preparing pairing token...</p>
        </div>
      </div>
    );
  }

  if (errorMsg && !device) {
    return (
      <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm text-center max-w-xl mx-auto mt-12 space-y-4">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-zinc-900">Pairing Error</h2>
        <p className="text-sm text-zinc-500">{errorMsg}</p>
        <Link href="/dashboard/devices" className="inline-block text-sm text-blue-600 font-semibold hover:underline">
          &larr; Back to Devices
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-md mx-auto">
      
      <div className="flex items-center">
        <Link href={`/dashboard/devices/${deviceId}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 transition-colors font-medium">
          <ChevronLeft className="h-4 w-4" /> Cancel Pairing
        </Link>
      </div>

      {success ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-8 shadow-sm text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
          <h2 className="text-lg font-bold text-zinc-900">Device Paired!</h2>
          <p className="text-sm text-zinc-500">
            Connection established successfully. Redirecting you back to device details...
          </p>
        </div>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl shadow-sm p-6 space-y-6 text-center">
          
          <div className="space-y-1">
            <h3 className="font-bold text-zinc-900 text-lg">Scan to Pair</h3>
            <p className="text-xs text-zinc-500">
              Generate connectivity for device: <span className="font-bold text-zinc-800">{device?.device_name}</span>
            </p>
          </div>

          {/* QR visual block wrapper */}
          <div className="mx-auto w-56 h-56 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-center p-4 relative">
            <div className="absolute inset-4 border-2 border-dashed border-blue-600/30 rounded flex items-center justify-center bg-white">
              {tokenData?.token ? (
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                    JSON.stringify({
                      token: tokenData.token,
                      server_url: getApiUrl()
                    })
                  )}`}
                  alt="Pairing QR Code"
                  className="h-44 w-44"
                />
              ) : (
                <QrCode className="h-32 w-32 text-zinc-300 animate-pulse" />
              )}
            </div>
          </div>

          {/* Token String Display */}
          <div className="space-y-2">
            <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block">Token Code</span>
            <code className="px-3 py-1 bg-zinc-100 border border-zinc-200 rounded text-sm text-zinc-800 font-mono select-all block break-all">
              {tokenData?.token}
            </code>
          </div>

          {/* Expiry / Polling Alert */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-2 text-xs rounded bg-red-50 border border-red-100 text-red-700 justify-center">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <div>{errorMsg}</div>
            </div>
          )}

          <div className="flex items-center justify-center gap-2 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5" />
            <span>One-time QR expires in 10 minutes</span>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <Button
              onClick={handleCheckStatus}
              disabled={isPolling}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 rounded-lg flex justify-center items-center gap-2 cursor-pointer"
            >
              {isPolling ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking connection status...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Verify Pairing status
                </>
              )}
            </Button>
          </div>

        </div>
      )}

    </div>
  );
}
