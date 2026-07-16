"use client";

import React, { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/context/AuthContext";
import {
  LayoutDashboard,
  Smartphone,
  Settings,
  Users,
  LogOut,
  Loader2
} from "lucide-react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading, logout } = useAuth();
  const pathname = usePathname();

  // Show a loading skeleton while validating credentials on mount
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-50">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-zinc-500 font-medium">Restoring session...</p>
        </div>
      </div>
    );
  }

  // Fallback protection check in case middleware didn't intercept early
  if (!user) {
    return null;
  }

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Devices", href: "/dashboard/devices", icon: Smartphone },
    { name: "User Management", href: "/dashboard/users", icon: Users },
    { name: "Company Settings", href: "/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-slate-900 gap-3">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-black text-sm shadow-[0_0_15px_rgba(37,99,235,0.4)]">
            DO
          </div>
          <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            DeviceOps
          </span>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.name} href={item.href} className="block">
                <span
                  className={`flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-blue-600/10 text-blue-400 border-l-2 border-blue-500 font-semibold"
                      : "text-slate-400 hover:bg-slate-900/60 hover:text-white"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-blue-400" : "text-slate-400"}`} />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Workspace Info & Logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/40">
          <div className="flex flex-col gap-2">
            <div className="px-3.5 py-3 bg-slate-900/50 rounded-xl border border-slate-900/60">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Active User</p>
              <p className="text-sm font-semibold text-slate-200 truncate mt-0.5" title={user.email}>
                {user.email}
              </p>
              <p className="text-[10px] text-blue-400 font-medium capitalize mt-0.5">{user.role.toLowerCase()}</p>
            </div>
            
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-3.5 py-2.5 text-sm font-medium text-red-400 rounded-lg hover:bg-red-950/20 hover:text-red-300 transition-colors cursor-pointer text-left"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Pane */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
          <h1 className="text-lg font-bold text-slate-900">
            {navItems.find((item) => item.href === pathname)?.name || "Workspace"}
          </h1>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-100 rounded-full uppercase tracking-wider">
              Enterprise Tenant Isolated
            </div>
          </div>
        </header>

        {/* Dashboard Content Area */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="w-full max-w-7xl mx-auto h-full">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
