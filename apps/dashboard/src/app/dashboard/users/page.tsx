"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/features/auth/context/AuthContext";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserPlus
} from "lucide-react";

interface WorkspaceUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  status: string;
  last_login_at: string | null;
  created_at: string;
}

interface UserListResponse {
  items: WorkspaceUser[];
  total: number;
  page: number;
  size: number;
}

export default function UserManagementPage() {
  const { user: activeUser } = useAuth();
  
  // List State
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<WorkspaceUser | null>(null);

  // Create Form State
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("ADMIN");
  const [isCreating, setIsCreating] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("ADMIN");
  const [isEditing, setIsEditing] = useState(false);

  // RBAC variables
  const isViewer = activeUser?.role === "VIEWER";
  const isAdmin = activeUser?.role === "ADMIN";
  const isOwner = activeUser?.role === "OWNER";

  async function fetchUsers() {
    try {
      setLoading(true);
      setErrorMsg(null);
      
      const query = `/api/v1/users/?page=${page}&size=5` + (search ? `&search=${encodeURIComponent(search)}` : "");
      const response = await apiFetch(query);
      
      if (response.ok) {
        const data: UserListResponse = await response.json();
        setUsers(data.items);
        setTotal(data.total);
      } else {
        setErrorMsg("Failed to retrieve user accounts.");
      }
    } catch (err) {
      setErrorMsg("Failed to query backend api services.");
    } finally {
      setLoading(false);
    }
  }

  // Load user list when page, search text changes
  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    // Form inputs validation
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      setErrorMsg("Please fill in all fields.");
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsCreating(true);
      const response = await apiFetch("/api/v1/users/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: newName,
          email: newEmail,
          password: newPassword,
          role: newRole,
        }),
      });

      if (response.ok) {
        setSuccessMsg("User account created successfully.");
        setIsCreateOpen(false);
        // Reset inputs
        setNewName("");
        setNewEmail("");
        setNewPassword("");
        setNewRole("ADMIN");
        // Reload list
        setPage(1);
        fetchUsers();
      } else {
        const errData = await response.json().catch(() => ({ detail: "Create failed" }));
        setErrorMsg(errData.detail || "Failed to create user account.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer || !selectedUser) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    if (!editName.trim() || !editEmail.trim()) {
      setErrorMsg("Name and Email are required fields.");
      return;
    }

    if (editPassword && editPassword.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    try {
      setIsEditing(true);
      const response = await apiFetch(`/api/v1/users/${selectedUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: editName,
          email: editEmail,
          password: editPassword || null,
          role: editRole,
        }),
      });

      if (response.ok) {
        setSuccessMsg("User details modified successfully.");
        setIsEditOpen(false);
        setSelectedUser(null);
        setEditPassword("");
        fetchUsers();
      } else {
        const errData = await response.json().catch(() => ({ detail: "Edit failed" }));
        setErrorMsg(errData.detail || "Failed to update user account.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleToggleStatus = async (user: WorkspaceUser) => {
    if (isViewer) return;
    
    // RBAC check: Admin cannot modify Owner
    if (isAdmin && user.role === "OWNER") {
      setErrorMsg("Administrators cannot change statuses of Owner accounts.");
      return;
    }

    // Safeguard: Cannot disable yourself
    if (user.id === activeUser?.id) {
      setErrorMsg("You cannot disable your own user account.");
      return;
    }

    setErrorMsg(null);
    setSuccessMsg(null);
    const targetStatus = user.status === "ACTIVE" ? "DISABLED" : "ACTIVE";

    try {
      const response = await apiFetch(`/api/v1/users/${user.id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (response.ok) {
        setSuccessMsg(`User status changed to ${targetStatus} successfully.`);
        fetchUsers();
      } else {
        const errData = await response.json().catch(() => ({ detail: "Status toggle failed" }));
        setErrorMsg(errData.detail || "Failed to alter user status.");
      }
    } catch (err) {
      setErrorMsg("Failed to connect to backend server.");
    }
  };

  const openEditModal = (user: WorkspaceUser) => {
    setSelectedUser(user);
    setEditName(user.full_name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword("");
    setIsEditOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Messages Alerts */}
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

      {/* Action Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between max-w-7xl">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
            <Search className="h-4 w-4" />
          </span>
          <input
            type="text"
            placeholder="Search users name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600/30 transition text-zinc-900"
          />
        </div>

        {!isViewer && (
          <Button
            onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add User
          </Button>
        )}
      </div>

      {/* Main Table Grid */}
      <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden max-w-7xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Full Name</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Email Address</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Role</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="p-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-500 text-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 mx-auto mb-2" />
                    Loading workspace members list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-500 text-sm">
                    No users matching criteria found.
                  </td>
                </tr>
              ) : (
                users.map((item) => {
                  const isSelf = item.id === activeUser?.id;
                  const canEdit = !isViewer && !(isAdmin && item.role === "OWNER");
                  const canDisable = !isViewer && !isSelf && !(isAdmin && item.role === "OWNER");

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="p-4 text-sm font-semibold text-zinc-900">
                        <div className="flex items-center gap-2">
                          {item.full_name}
                          {isSelf && (
                            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded font-normal">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-zinc-600">{item.email}</td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${
                          item.role === "OWNER"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : item.role === "ADMIN"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}>
                          {item.role}
                        </span>
                      </td>
                      <td className="p-4 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                          item.status === "ACTIVE"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-right space-x-2">
                        {canEdit && (
                          <button
                            onClick={() => openEditModal(item)}
                            className="inline-flex items-center gap-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 p-1.5 rounded transition cursor-pointer"
                            title="Edit User Details"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        )}
                        {canDisable && (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            className={`inline-flex items-center gap-1 p-1.5 rounded transition cursor-pointer ${
                              item.status === "ACTIVE"
                                ? "text-amber-600 hover:text-amber-950 hover:bg-amber-50"
                                : "text-green-600 hover:text-green-950 hover:bg-green-50"
                            }`}
                            title={item.status === "ACTIVE" ? "Disable Account" : "Enable Account"}
                          >
                            {item.status === "ACTIVE" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        {total > 0 && (
          <div className="p-4 border-t border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              Showing users {((page - 1) * 5) + 1} to {Math.min(page * 5, total)} of {total}
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

      {/* CREATE MODAL FORM */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" /> Add New Member
              </h3>
            </div>
            
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                  placeholder="John Doe"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                  placeholder="john@company.com"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                >
                  {isOwner && <option value="OWNER">OWNER</option>}
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL FORM */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-xl shadow-lg p-6 space-y-6">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-blue-600" /> Edit Member Profile
              </h3>
            </div>
            
            <form onSubmit={handleEditUser} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">
                  Password <span className="text-[10px] text-zinc-400 lowercase">(blank to keep current)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                  placeholder="••••••••"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg outline-none focus:border-blue-600 text-zinc-900"
                >
                  {isOwner && <option value="OWNER">OWNER</option>}
                  <option value="ADMIN">ADMIN</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 text-sm font-medium border border-zinc-200 rounded-lg hover:bg-zinc-50 cursor-pointer"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  disabled={isEditing}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-4 py-2 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {isEditing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
