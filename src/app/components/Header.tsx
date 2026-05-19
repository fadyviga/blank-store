"use client";

import { ShoppingCart, User, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCart } from "../hooks/useCart";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const router = useRouter();
  const { cartCount } = useCart();
  const { user, logout, isAuthenticated } = useAuth();

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white transition"
              >
                <User size={16} />
                <span className="hidden sm:inline text-xs truncate max-w-[100px]">
                  {user?.email}
                </span>
              </button>
              <button
                onClick={logout}
                className="text-zinc-500 hover:text-white transition"
                title="Logout"
              >
                <LogOut size={16} />
              </button>
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
