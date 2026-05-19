"use client";

import { useEffect } from "react";
import { X, Shirt, ArrowUp, ArrowLeftRight } from "lucide-react";

const SIZES = [
  { size: "M", length: 70, width: 55 },
  { size: "L", length: 71, width: 58 },
  { size: "XL", length: 73, width: 61 },
  { size: "XXL", length: 75, width: 65 },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SizeChart({ open, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md animate-scale-in bg-zinc-900/95 border border-white/10 rounded-3xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition cursor-pointer"
          aria-label="Close size chart"
        >
          <X size={16} className="text-zinc-400" />
        </button>

        <div className="flex items-center gap-3 mb-7">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-400 shrink-0"
          >
            <rect x="2" y="6" width="20" height="12" rx="1" />
            <path d="M6 6v12" />
            <path d="M10 6v12" />
            <path d="M14 6v12" />
            <path d="M18 6v12" />
          </svg>
          <div>
            <h2 className="text-xl font-bold">Size Guide</h2>
            <p className="text-zinc-500 text-xs mt-0.5">
              Oversized Tee &mdash; measurements in cm
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <table className="w-full">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left px-5 py-3.5 text-xs uppercase tracking-[0.2em] text-zinc-400 font-medium w-[15%]">
                  Size
                </th>
                <th className="text-center px-2 py-3.5 font-medium">
                  <div className="flex flex-col items-center gap-0.5">
                    <Shirt size={14} className="text-zinc-500" />
                    <ArrowUp size={12} className="text-zinc-500" />
                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 mt-0.5">
                      Length
                    </span>
                  </div>
                </th>
                <th className="text-center px-2 py-3.5 font-medium">
                  <div className="flex flex-col items-center gap-0.5">
                    <Shirt size={14} className="text-zinc-500" />
                    <ArrowLeftRight size={12} className="text-zinc-500" />
                    <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-400 mt-0.5">
                      Width
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {SIZES.map((s, i) => (
                <tr
                  key={s.size}
                  className="border-t border-white/5 hover:bg-white/[0.04] transition-colors"
                  style={{
                    animation: `slide-in 0.35s ease-out ${i * 80}ms both`,
                  }}
                >
                  <td className="px-5 py-4 font-bold text-white">{s.size}</td>
                  <td className="px-5 py-4 text-zinc-300">{s.length} cm</td>
                  <td className="px-5 py-4 text-zinc-300">{s.width} cm</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 space-y-2 text-xs text-zinc-500 leading-relaxed">
          <p>📏 Measurements may vary slightly (1–2 cm).</p>
          <p>💡 Oversized fit — choose your normal size.</p>
        </div>
      </div>
    </div>
  );
}
