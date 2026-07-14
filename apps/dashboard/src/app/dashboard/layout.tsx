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
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-50 font-sans text-zinc-950">
      
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-zinc-200 bg-white flex flex-col shrink-0">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-zinc-200 gap-2">
          <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white font-bold text-sm">
            DO
          </div>
          <span className="font-bold text-lg tracking-tight text-zinc-900">DeviceOps</span>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            
            return (
              <Link key={item.name} href={item.href} className="block">
                <span
                  className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* User Workspace Info & Logout */}
        <div className="p-4 border-t border-zinc-200 bg-zinc-50/50">
          <div className="flex flex-col gap-2">
            <div className="px-3">
              <p className="text-xs text-zinc-400 font-semibold uppercase tracking-wider">Active User</p>
              <p className="text-sm font-semibold text-zinc-800 truncate" title={user.email}>
                {user.email}
              </p>
              <p className="text-[10px] text-zinc-400 capitalize">{user.role.toLowerCase()}</p>
            </div>
            
            <button
              onClick={logout}
              className="flex w-full items-center gap-3 px-3 py-2 text-sm font-medium text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer text-left"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Pane */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-8 shrink-0">
          <h1 className="text-lg font-semibold text-zinc-900">
            {navItems.find((item) => item.href === pathname)?.name || "Workspace"}
          </h1>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 text-xs font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full">
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
