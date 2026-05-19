import React, { useState } from "react";
import { Users, Search, MessageSquare, Settings } from "lucide-react";
import { UsersTab } from "./UsersTab";
import { AuditLogsTab } from "./AuditLogsTab";
import { FeedbackTab } from "./FeedbackTab";
import { useLanguage } from "../contexts/LanguageContext";

export function SettingsContainer() {
  const userRole = localStorage.getItem("admin-role") || "Usuário";
  const isAuthorized = userRole === "SuperAdmin" || userRole === "Admin";
  const [activeTab, setActiveTab] = useState("users");
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header and Sub-navigation */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <Settings className="text-[#DC2626]" size={28} />
            {t("settings.title")}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">
            {t("settings.desc")}
          </p>
        </div>

        <div className="flex flex-wrap sm:flex-nowrap bg-white dark:bg-zinc-900 p-1 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none w-full sm:w-fit transition-colors duration-300 overflow-x-auto hide-scrollbar">
          {isAuthorized && (
            <>
              <button
                onClick={() => setActiveTab("users")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold rounded-sm transition-all whitespace-nowrap ${
                  activeTab === "users"
                    ? "bg-[#DC2626] text-white shadow-md dark:shadow-none"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <Users size={16} />
                {t("settings.access")}
              </button>
              
              <button
                onClick={() => setActiveTab("audit")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-sm transition-all ${
                  activeTab === "audit"
                    ? "bg-[#DC2626] text-white shadow-md dark:shadow-none"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <Search size={16} />
                {t("settings.audit")}
              </button>

              <button
                onClick={() => setActiveTab("feedback")}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-sm transition-all ${
                  activeTab === "feedback"
                    ? "bg-[#DC2626] text-white shadow-md dark:shadow-none"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
              >
                <MessageSquare size={16} />
                {t("settings.feedback")}
              </button>
            </>
          )}


        </div>
      </div>

      {/* Render Active Tab - Removing inner titles via CSS to keep it clean */}
      <div className="[&>div>div:first-child]:hidden mt-2">
        {isAuthorized && activeTab === "users" && <UsersTab />}
        {isAuthorized && activeTab === "audit" && <AuditLogsTab />}
        {isAuthorized && activeTab === "feedback" && <FeedbackTab />}
      </div>
    </div>
  );
}
