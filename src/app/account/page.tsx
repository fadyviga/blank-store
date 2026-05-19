"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Package, Save, Lock, Check, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loadUserOrders, type Order } from "../../lib/order";

export default function AccountPage() {
  const router = useRouter();
  const { user, loading, updateProfile, changePassword } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
      return;
    }
    if (user?.id) {
      loadUserOrders(user.id).then(setOrders);
      if (user.name) setDisplayName(user.name);
      if (user.phone) setPhone(user.phone);
    }
  }, [user, loading, router]);

  const handleProfileSave = () => {
    const err = updateProfile({ name: displayName.trim(), phone: phone.trim() });
    if (err) {
      setProfileMsg({ type: "error", text: err });
    } else {
      setProfileMsg({ type: "success", text: "Profile updated" });
    }
    setTimeout(() => setProfileMsg(null), 3000);
  };

  const handlePasswordChange = () => {
    setPwMsg(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: "error", text: "Please fill in all fields" });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "Passwords do not match" });
      return;
    }
    if (newPw.length < 4) {
      setPwMsg({ type: "error", text: "Password must be at least 4 characters" });
      return;
    }
    const err = changePassword(currentPw, newPw);
    if (err) {
      setPwMsg({ type: "error", text: err });
    } else {
      setPwMsg({ type: "success", text: "Password changed successfully" });
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    }
    setTimeout(() => setPwMsg(null), 3000);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading...</div>
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-black text-white p-6 md:p-10">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-12">
          <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
            <User size={24} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{user.email}</h1>
            <p className="text-zinc-500 text-sm">
              {user.role === "admin" ? "Administrator" : "Customer"}
            </p>
          </div>
        </div>

        <section className="border-t border-white/10 pt-10 mb-12">
          <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 md:p-8 space-y-6">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Email</label>
              <input
                type="text"
                value={user.email}
                disabled
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none text-zinc-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Full Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
              />
            </div>

            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Phone Number
              </label>
              <div className="flex gap-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
                />
                <button
                  onClick={handleProfileSave}
                  className="bg-white text-black px-5 py-4 rounded-xl font-bold text-sm hover:scale-[1.02] transition flex items-center gap-2"
                >
                  <Save size={16} />
                  Save
                </button>
              </div>
              {profileMsg && (
                <p
                  className={`text-sm mt-2 flex items-center gap-1 ${
                    profileMsg.type === "success" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {profileMsg.type === "success" ? (
                    <Check size={14} />
                  ) : (
                    <X size={14} />
                  )}
                  {profileMsg.text}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 pt-10 mb-12">
          <div className="flex items-center gap-2 mb-6">
            <Lock size={20} className="text-zinc-400" />
            <h2 className="text-2xl font-bold">Change Password</h2>
          </div>

          <div className="bg-zinc-950 border border-white/10 rounded-3xl p-6 md:p-8 space-y-5 max-w-md">
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Current Password
              </label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                New Password
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
              />
            </div>
            <div>
              <label className="block text-sm text-zinc-400 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              className="bg-white text-black px-6 py-4 rounded-xl font-bold text-sm hover:scale-[1.02] transition"
            >
              Update Password
            </button>
            {pwMsg && (
              <p
                className={`text-sm flex items-center gap-1 ${
                  pwMsg.type === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {pwMsg.type === "success" ? (
                  <Check size={14} />
                ) : (
                  <X size={14} />
                )}
                {pwMsg.text}
              </p>
            )}
          </div>
        </section>

        <section className="border-t border-white/10 pt-10">
          <div className="flex items-center gap-2 mb-6">
            <Package size={20} className="text-zinc-400" />
            <h2 className="text-2xl font-bold">My Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="bg-zinc-950 border border-white/10 rounded-3xl p-10 text-center">
              <p className="text-zinc-500 mb-4">No orders yet</p>
              <button
                onClick={() => router.push("/")}
                className="bg-white text-black px-6 py-3 rounded-full font-medium hover:scale-105 transition"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-950 border border-white/10 rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-zinc-500 tracking-wider">
                      {order.displayId}
                    </span>
                    <span className="text-xs font-medium capitalize text-zinc-400">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-lg font-bold">{order.total} EGP</p>
                  <p className="text-zinc-500 text-xs mt-1">
                    {new Date(order.createdAt).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
