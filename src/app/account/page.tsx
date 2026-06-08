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
    <main className="min-h-screen bg-black text-white px-6 py-10 md:px-10 md:py-14">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-12 md:mb-14">
          <div className="w-14 h-14 rounded-full bg-zinc-800/80 flex items-center justify-center border border-white/[0.06]">
            <User size={22} className="text-zinc-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">{user.email}</h1>
            <p className="text-zinc-500 text-sm tracking-wide">
              {user.role === "admin" ? "Administrator" : "Customer"}
            </p>
          </div>
        </div>

        <section className="mb-14 md:mb-16">
          <h2 className="text-lg font-bold tracking-tight mb-6">Profile Settings</h2>

          <div className="bg-zinc-900/50 border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-5 md:space-y-6">
            <div>
              <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">Email</label>
              <input
                type="text"
                value={user.email}
                disabled
                className="w-full bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 outline-none text-zinc-500 cursor-not-allowed text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">Full Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 outline-none text-sm transition-all duration-200 focus:border-white/30"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">Phone Number</label>
              <div className="flex gap-3">
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 01012345678"
                  className="flex-1 bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 outline-none text-sm transition-all duration-200 focus:border-white/30"
                />
                <button
                  onClick={handleProfileSave}
                  className="bg-white text-black px-6 py-4 rounded-xl font-semibold text-sm hover:scale-[1.02] hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)] transition-all duration-300 flex items-center gap-2 cursor-pointer"
                >
                  <Save size={15} />
                  Save
                </button>
              </div>
              {profileMsg && (
                <p
                  className={`text-xs mt-2 flex items-center gap-1.5 ${
                    profileMsg.type === "success" ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {profileMsg.type === "success" ? (
                    <Check size={12} />
                  ) : (
                    <X size={12} />
                  )}
                  {profileMsg.text}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mb-14 md:mb-16">
          <div className="flex items-center gap-2.5 mb-6">
            <Lock size={17} className="text-zinc-400" />
            <h2 className="text-lg font-bold tracking-tight">Change Password</h2>
          </div>

          <div className="bg-zinc-900/50 border border-white/[0.06] rounded-3xl p-6 md:p-8 space-y-5 max-w-md">
            <div>
              <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">Current Password</label>
              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 outline-none text-sm transition-all duration-200 focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">New Password</label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 outline-none text-sm transition-all duration-200 focus:border-white/30"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 tracking-wider uppercase mb-2.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full bg-zinc-900/50 border border-white/[0.06] rounded-xl px-5 py-4 outline-none text-sm transition-all duration-200 focus:border-white/30"
              />
            </div>
            <button
              onClick={handlePasswordChange}
              className="bg-white text-black w-full py-4 rounded-xl font-semibold text-sm hover:scale-[1.02] hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer"
            >
              Update Password
            </button>
            {pwMsg && (
              <p
                className={`text-xs flex items-center gap-1.5 ${
                  pwMsg.type === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {pwMsg.type === "success" ? (
                  <Check size={12} />
                ) : (
                  <X size={12} />
                )}
                {pwMsg.text}
              </p>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center gap-2.5 mb-6">
            <Package size={17} className="text-zinc-400" />
            <h2 className="text-lg font-bold tracking-tight">My Orders</h2>
          </div>

          {orders.length === 0 ? (
            <div className="bg-zinc-900/50 border border-white/[0.06] rounded-3xl p-12 md:p-14 text-center">
              <Package size={40} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 mb-6">No orders yet</p>
              <button
                onClick={() => router.push("/")}
                className="bg-white text-black px-8 py-3.5 rounded-full font-semibold text-sm hover:scale-[1.02] hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer"
              >
                Start Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="bg-zinc-900/50 border border-white/[0.06] rounded-2xl p-5 md:p-6 transition-all duration-300 hover:border-white/20 hover:bg-white/[0.01]"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-zinc-500 tracking-wider">
                      {order.displayId}
                    </span>
                    <span className="text-[11px] font-medium capitalize text-zinc-400 tracking-wide">
                      {order.status}
                    </span>
                  </div>
                  <p className="text-xl font-bold tracking-tight">{order.total} EGP</p>
                  <p className="text-zinc-500 text-xs mt-1.5">
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
