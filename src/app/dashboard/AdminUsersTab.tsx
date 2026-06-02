"use client";

import { useState, useEffect } from "react";
import { Users, Plus, Trash2, Loader2, X } from "lucide-react";

interface AdminUser {
  id: number;
  username: string;
  role: "admin" | "viewer";
  created_at: string;
}

export default function AdminUsersTab({ userRole }: { userRole: "admin" | "viewer" }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", password: "", role: "viewer" });
  const [formError, setFormError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin-users");
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      console.error("Failed to load admin users");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async () => {
    setFormError("");
    if (!form.username.trim() || !form.password.trim()) {
      setFormError("Username and password required");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters");
      return;
    }
    setFormLoading(true);
    try {
      const res = await fetch("/api/admin-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: form.username.trim(), password: form.password, role: form.role }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setForm({ username: "", password: "", role: "viewer" });
        fetchUsers();
      } else {
        setFormError(data.error || "Failed to create user");
      }
    } catch {
      setFormError("Network error");
    }
    setFormLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this user?")) return;
    try {
      const res = await fetch(`/api/admin-users?id=${id}`, { method: "DELETE" });
      if (res.ok) fetchUsers();
    } catch {
      console.error("Failed to delete user");
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 size={24} className="animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Dashboard Users</h2>
        {userRole === "admin" && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-xl text-sm font-bold hover:scale-[1.02] transition"
          >
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      {showForm && userRole === "admin" && (
        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 space-y-4 max-w-md">
          {formError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {formError}
            </div>
          )}
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Username</label>
            <input
              type="text" value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Password</label>
            <input
              type="password" value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
            />
          </div>
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Role</label>
            <select
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              className="w-full bg-zinc-800 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-white/30"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleCreate}
              disabled={formLoading}
              className="bg-white text-black px-6 py-2.5 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center gap-2 disabled:opacity-50"
            >
              {formLoading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create User
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="border border-white/10 px-6 py-2.5 rounded-xl text-sm hover:bg-zinc-800 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="bg-zinc-950 border border-white/10 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left p-4 text-zinc-500 font-medium">Username</th>
              <th className="text-left p-4 text-zinc-500 font-medium">Role</th>
              <th className="text-left p-4 text-zinc-500 font-medium">Created</th>
              {userRole === "admin" && <th className="text-right p-4 text-zinc-500 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-white/5">
                <td className="p-4 font-medium">{u.username}</td>
                <td className="p-4">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    u.role === "admin"
                      ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                      : "bg-green-500/15 text-green-400 border border-green-500/30"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-zinc-400 text-xs">
                  {new Date(u.created_at).toLocaleDateString("en-GB")}
                </td>
                {userRole === "admin" && (
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(u.id)}
                      className="text-red-500 hover:text-red-400 transition"
                      title="Delete user"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && (
          <p className="text-zinc-500 text-center py-8">No dashboard users found.</p>
        )}
      </div>
    </div>
  );
}
