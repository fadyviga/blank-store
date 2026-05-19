"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogIn, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setLoading(true);
    const err = await login(email, password);
    setLoading(false);

    if (err) {
      setError(err);
      return;
    }

    router.push("/");
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8">Sign In</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3 text-center">
              {error}
            </div>
          )}

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <LogIn size={20} />
            )}
            Sign In
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-zinc-500 space-y-2">
          <p>
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-white hover:underline">
              Sign up
            </Link>
          </p>
          <p>
            <Link
              href="/forgot-password"
              className="text-zinc-400 hover:text-white transition"
            >
              Forgot password?
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
