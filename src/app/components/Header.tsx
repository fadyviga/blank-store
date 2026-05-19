"use client";

import { useState, useRef, useEffect } from "react";
import { ShoppingCart, User, LogOut, Settings, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const router = useRouter();
  const { cartCount } = useCart();
  const { user, logout, isAuthenticated } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClick);
    }
    return () => document.removeEventListener("mousedown", handleClick);
  }, [dropdownOpen]);

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-black/40 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="h-10 flex items-center">
          <img
            src="/logo.png"
            alt="Blank EG"
            className="h-48 w-auto object-contain"
          />
        </button>

        <div className="flex items-center gap-4">
          <a
            href="https://wa.me/201287659463"
            target="_blank"
            className="text-sm text-zinc-300 hover:text-white transition hidden sm:block"
          >
            WhatsApp
          </a>

          {isAuthenticated ? (
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition cursor-pointer"
              >
                <User size={16} />
                <span className="hidden sm:inline text-xs truncate max-w-[100px]">
                  {user?.email}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-2 w-52 bg-zinc-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-2 animate-scale-in origin-top-right">
                  <button
                    onClick={() => { setDropdownOpen(false); router.push("/account"); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition text-left"
                  >
                    <Settings size={15} />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); router.push("/account"); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-zinc-300 hover:text-white hover:bg-white/5 transition text-left"
                  >
                    <Package size={15} />
                    My Orders
                  </button>
                  <div className="border-t border-white/10 my-1" />
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-400 hover:bg-white/5 transition text-left"
                  >
                    <LogOut size={15} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-sm text-zinc-300 hover:text-white transition"
            >
              Login / Sign up
            </button>
          )}

          <button
            onClick={() => router.push("/cart")}
            className="relative flex items-center gap-2 bg-white text-black px-5 py-2 rounded-full text-sm font-medium hover:scale-105 transition"
          >
            <ShoppingCart size={18} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
