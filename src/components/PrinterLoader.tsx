"use client";

import { useId } from "react";

interface PrinterLoaderProps {
  fullScreen?: boolean;
  label?: string;
  dark?: boolean;
}

export default function PrinterLoader({ fullScreen = false, label = "جاري التحميل...", dark = false }: PrinterLoaderProps) {
  const clipId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const gradientId = `${clipId}-grad`;

  const loader = (
    <div
      role="status"
      aria-live="polite"
      className={`printer-loader flex flex-col items-center gap-5 select-none ${dark ? "text-white" : "text-gray-600"}`}
    >
      <svg width="200" height="160" viewBox="0 0 220 170" fill="none" aria-hidden="true">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#1e3a8a" />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="30" y="88" width="160" height="82" />
          </clipPath>
        </defs>

        <ellipse cx="110" cy="158" rx="68" ry="8" fill="#0f172a" opacity="0.1" />

        {/* top feed unit */}
        <rect x="58" y="44" width="104" height="36" rx="10" fill="#1e40af" />
        <rect x="76" y="38" width="68" height="10" rx="5" fill="#16307d" />

        {/* main body */}
        <g className="pl-body">
          <rect x="30" y="76" width="160" height="70" rx="14" fill={`url(#${gradientId})`} />
          <rect x="52" y="84" width="116" height="7" rx="3.5" fill="#0b1f56" />
          <circle className="pl-led" cx="166" cy="103" r="5" fill="#4ade80" />
          <rect x="42" y="99" width="36" height="6" rx="3" fill="#ffffff" opacity="0.4" />
          <rect x="42" y="111" width="24" height="6" rx="3" fill="#ffffff" opacity="0.25" />
        </g>

        {/* printed sheet sliding out */}
        <g clipPath={`url(#${clipId})`}>
          <g className="pl-sheet">
            <rect x="64" y="96" width="92" height="116" rx="6" fill="#ffffff" stroke="#dbeafe" strokeWidth="2" />
            <rect x="78" y="110" width="50" height="9" rx="4.5" fill="#93c5fd" />
            <rect x="78" y="128" width="64" height="5" rx="2.5" fill="#e2e8f0" />
            <rect x="78" y="139" width="56" height="5" rx="2.5" fill="#e2e8f0" />
            <rect x="78" y="150" width="62" height="5" rx="2.5" fill="#e2e8f0" />
            <rect x="78" y="164" width="30" height="22" rx="4" fill="#2563eb" opacity="0.15" />
            <rect x="114" y="164" width="28" height="22" rx="4" fill="#10b981" opacity="0.18" />
            <rect x="148" y="164" width="0" height="0" fill="none" />
          </g>
        </g>
      </svg>

      <div className="flex flex-col items-center gap-3">
        <p className={`text-sm font-medium ${dark ? "text-blue-100" : "text-gray-600"}`}>{label}</p>
        <div className={`w-44 h-1.5 rounded-full overflow-hidden ${dark ? "bg-white/15" : "bg-gray-200"}`}>
          <div className="pl-fill h-full w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-400" />
        </div>
      </div>
    </div>
  );

  if (!fullScreen) return loader;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm">
      {loader}
    </div>
  );
}
