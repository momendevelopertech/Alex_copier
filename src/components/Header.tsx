"use client";

import { useI18n } from "@/i18n/context";
import { Bell, User, ChevronDown } from "lucide-react";

export default function Header({ title }: { title: string }) {
  const { locale, setLocale, t } = useI18n();

  const toggleLanguage = () => {
    setLocale(locale === "ar" ? "en" : "ar");
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>

      <div className="flex items-center gap-4">
        <button
          onClick={toggleLanguage}
          className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {locale === "ar" ? "EN" : "AR"}
        </button>

        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
          <ChevronDown size={16} className="text-gray-400" />
        </div>
      </div>
    </header>
  );
}
