"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSent(true);
  };

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition mb-8"
        >
          <ArrowLeft size={18} />
          Back to Sign In
        </Link>

        <h1 className="text-3xl font-bold mb-3">Reset Password</h1>
        <p className="text-zinc-400 text-sm mb-8">
          Enter your email address and we&apos;ll send you a link to reset your
          password.
        </p>

        {sent ? (
          <div className="text-center py-10">
            <CheckCircle size={48} className="mx-auto text-green-400 mb-4" />
            <p className="text-green-400 font-medium mb-2">Check your email</p>
            <p className="text-zinc-500 text-sm">
              If an account exists with {email}, you&apos;ll receive a reset
              link shortly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-5 py-4 outline-none focus:border-white/30 transition"
            />

            <button
              type="submit"
              className="w-full bg-white text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition"
            >
              <Mail size={20} />
              Send Reset Link
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
