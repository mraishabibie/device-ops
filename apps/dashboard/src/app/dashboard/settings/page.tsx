"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Building,
  Globe,
  Clock,
  Calendar,
  Lock
} from "lucide-react";

interface CompanyProfile {
  id: string;
  name: string;
  slug: string;
  contact_email: string | null;
  website: string | null;
  support_phone: string | null;
  logo_url: string | null;
  timezone: string;
  date_format: string;
  status: string;
}

// Curated list of standard backend-compatible IANA Timezones (refinement 3)
const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT)" },
  { value: "America/Chicago", label: "America/Chicago (CST/CDT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PST/PDT)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET/CEST)" },
  { value: "Asia/Tokyo", label: "Asia/Tokyo (JST)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Asia/Jakarta", label: "Asia/Jakarta (WIB)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (e.g. 2026-07-14)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY (e.g. 14/07/2026)" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY (e.g. 07/14/2026)" },
];

export default function CompanySettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");

  // Enforce read-only constraint for VIEWER users
  const isReadOnly = user?.role === "VIEWER";

  useEffect(() => {
    async function loadCompanyDetails() {
      try {
        const response = await apiFetch("/api/v1/companies/me");
        if (response.ok) {
          const data: CompanyProfile = await response.json();
          setProfile(data);
          
          // Populate Form bindings
          setName(data.name || "");
          setContactEmail(data.contact_email || "");
          setSupportPhone(data.support_phone || "");
          setWebsite(data.website || "");
          setTimezone(data.timezone || "UTC");
          setDateFormat(data.date_format || "YYYY-MM-DD");
        } else {
          setErrorMsg("Failed to load company workspace settings.");
        }
      } catch (err) {
        console.error("Error loading workspace data:", err);
        setErrorMsg("Failed to query backend api services.");
      } finally {
        setLoading(false);
      }
    }

    loadCompanyDetails();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    setSuccessMsg(null);
    setErrorMsg(null);

    // Form inputs validation
    if (!name.trim()) {
      setErrorMsg("Company Name is a required field.");
      return;
    }

    // Website HTTPS validation check (refinement 2)
    if (website && !website.startsWith("https://")) {
      setErrorMsg("Website must be a valid HTTPS URL starting with https://");
      return;
    }

    try {
      setIsSaving(true);
      const response = await apiFetch("/api/v1/companies/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          contact_email: contactEmail || null,
          support_phone: supportPhone || null,
          website: website || null,
          timezone,
          date_format: dateFormat,
        }),
      });

      if (response.ok) {
        const data: CompanyProfile = await response.json();
        setProfile(data);
        setSuccessMsg("Company profile updated successfully.");
      } else {
        const errData = await response.json().catch(() => ({ detail: "Update failed" }));
        setErrorMsg(errData.detail || "Failed to update company settings.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-28 bg-white border border-zinc-200 rounded-xl p-6 shadow-sm flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-zinc-500 text-sm font-medium">Retrieving workspace settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      
      {/* Viewer Guard warning banner */}
      {isReadOnly && (
        <div className="flex items-center gap-3 p-4 text-sm rounded-lg bg-amber-50 border border-amber-200 text-amber-700">
          <Lock className="h-5 w-5 shrink-0" />
          <div>
            <span className="font-semibold">Read-Only Workspace:</span> You are logged in with a <span className="font-bold">Viewer</span> profile and do not have administrative access to change company settings.
          </div>
        </div>
      )}

      {/* Success / Error Feedbacks */}
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

      {/* Settings Form Container */}
      <form onSubmit={handleSave} className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
        
        {/* Card Header */}
        <div className="p-6 border-b border-zinc-200 bg-zinc-50/50 flex items-center gap-3">
          <Building className="h-5 w-5 text-zinc-500" />
          <div>
            <h3 className="font-bold text-zinc-900">Workspace Settings</h3>
            <p className="text-xs text-zinc-500">Configure global metadata parameters for your enterprise tenant</p>
          </div>
        </div>

        {/* Inputs */}
        <div className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Company Name */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Company Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSaving || isReadOnly}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition disabled:opacity-60 text-zinc-900"
                placeholder="Enterprise Inc."
              />
            </div>

            {/* Workspace Slug (READ ONLY - refinement 1) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
                Workspace Slug <Lock className="h-3 w-3 text-zinc-400" />
              </label>
              <input
                type="text"
                value={profile?.slug || ""}
                disabled={true}
                className="w-full px-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-400 cursor-not-allowed"
                title="Workspace Slug is read-only after creation."
              />
            </div>

            {/* Contact Email */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Contact Email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={isSaving || isReadOnly}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition disabled:opacity-60 text-zinc-900"
                placeholder="ops@company.com"
              />
            </div>

            {/* Support Phone */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                Support Phone
              </label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                disabled={isSaving || isReadOnly}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition disabled:opacity-60 text-zinc-900"
                placeholder="+1-555-0199"
              />
            </div>

            {/* Website URL (refinement 2: starts with https://) */}
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
                Website URL <Globe className="h-3 w-3 text-zinc-400" />
              </label>
              <input
                type="text"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                disabled={isSaving || isReadOnly}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition disabled:opacity-60 text-zinc-900"
                placeholder="https://www.company.com"
              />
              <p className="text-[10px] text-zinc-400">Must start with https:// for security verification.</p>
            </div>

            {/* Timezone (dropdown - refinement 3) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
                Workspace Timezone <Clock className="h-3 w-3 text-zinc-400" />
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={isSaving || isReadOnly}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition disabled:opacity-60 text-zinc-900"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Format (dropdown) */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block flex items-center gap-1">
                Date Display Format <Calendar className="h-3 w-3 text-zinc-400" />
              </label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                disabled={isSaving || isReadOnly}
                className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition disabled:opacity-60 text-zinc-900"
              >
                {DATE_FORMATS.map((fmt) => (
                  <option key={fmt.value} value={fmt.value}>
                    {fmt.label}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>

        {/* Card Actions Footer */}
        {!isReadOnly && (
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50/50 flex justify-end">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        )}

      </form>

    </div>
  );
}
