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
    <nav className="fixed top-0 w-full z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 py-3 md:py-4 flex items-center justify-between">
        <button onClick={() => router.push("/")} className="flex items-center cursor-pointer">
          <img
            src="/logo.png"
            alt="Blank EG"
            className="h-24 md:h-28 w-auto object-contain"
          />
        </button>

        <div className="flex items-center gap-3 md:gap-5">
          <a
            href="https://wa.me/201287659463"
            target="_blank"
            className="text-xs md:text-sm text-zinc-500 hover:text-white tracking-wider uppercase transition-all duration-300 hidden sm:block relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
          >
            WhatsApp
          </a>

          {isAuthenticated ? (
            <div className="flex items-center relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-all duration-300 cursor-pointer"
              >
                <User size={15} />
                <span className="hidden sm:inline text-xs truncate max-w-[100px]">
                  {user?.email}
                </span>
              </button>

              {dropdownOpen && (
                <div className="absolute top-full right-0 mt-3 w-52 bg-zinc-900/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl py-2 animate-dropdown-in origin-top-right overflow-hidden">
                  <div className="absolute top-0 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
                  <button
                    onClick={() => { setDropdownOpen(false); router.push("/account"); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200 text-left"
                  >
                    <Settings size={14} />
                    Profile Settings
                  </button>
                  <button
                    onClick={() => { setDropdownOpen(false); router.push("/account"); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-zinc-400 hover:text-white hover:bg-white/[0.04] transition-all duration-200 text-left"
                  >
                    <Package size={14} />
                    My Orders
                  </button>
                  <div className="border-t border-white/[0.06] my-1" />
                  <button
                    onClick={() => { setDropdownOpen(false); logout(); }}
                    className="w-full flex items-center gap-3 px-5 py-3 text-sm text-red-400/80 hover:text-red-400 hover:bg-white/[0.04] transition-all duration-200 text-left"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => router.push("/login")}
              className="text-xs text-zinc-500 hover:text-white tracking-wider uppercase transition-all duration-300 relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-white after:transition-all after:duration-300 hover:after:w-full"
            >
              Sign In
            </button>
          )}

          <button
            onClick={() => router.push("/cart")}
            className="relative flex items-center gap-2 bg-white text-black px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold hover:scale-[1.03] hover:shadow-[0_0_24px_-4px_rgba(255,255,255,0.2)] active:scale-[0.97] transition-all duration-300 cursor-pointer"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-lg">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
