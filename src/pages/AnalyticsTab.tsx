import React, { useState, Suspense } from "react";
import { BarChartIcon, PieChartIcon, Clock, Loader2 } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";

// Lazy Loading — Cada sub-tab é carregada sob demanda (code splitting)
const WeeklyReportTab = React.lazy(() => import("./WeeklyReportTab").then(m => ({ default: m.WeeklyReportTab })));
const ResolutionsTab = React.lazy(() => import("./ResolutionsTab").then(m => ({ default: m.ResolutionsTab })));
const MtbfTab = React.lazy(() => import("./MtbfTab").then(m => ({ default: m.MtbfTab })));

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-64 w-full">
      <Loader2 className="h-8 w-8 animate-spin text-red-500" />
    </div>
  );
}

interface Ticket {
  id: string;
  type: string;
  location: string;
  agv_number: string | null;
  part_name: string | null;
  sap_number: string | null;
  side: string | null;
  observation: string | null;
  image_path: string | null;
  status: string;
  created_at: string;
  [key: string]: any;
}

interface Props {
  tickets: Ticket[];
  getStatusBadge: (status: string) => React.ReactNode;
}

export function AnalyticsTab({ tickets, getStatusBadge }: Readonly<Props>) {
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const { t } = useLanguage();

  const subTabNav = (
    <div className="flex bg-white dark:bg-zinc-900 p-1 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-sm w-full md:w-fit shrink-0 transition-colors duration-300">
      <button
        onClick={() => setActiveSubTab("overview")}
        className={`flex-1 md:flex-none flex justify-center items-center px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.65rem,1.5vw,0.875rem)] font-bold rounded-sm transition-all ${
          activeSubTab === "overview"
            ? "bg-[#DC2626] text-white shadow-md"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
      >
        <span className="hidden sm:inline">{t("analytics.overview")}</span>
        <span className="sm:hidden">{t("analytics.overview").split(' ')[0]}</span>
      </button>
      
      <button
        onClick={() => setActiveSubTab("mttr")}
        className={`flex-1 md:flex-none flex justify-center items-center px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.65rem,1.5vw,0.875rem)] font-bold rounded-sm transition-all ${
          activeSubTab === "mttr"
            ? "bg-[#DC2626] text-white shadow-md"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
      >
        <span>{t("analytics.mttr")}</span>
      </button>

      <button
        onClick={() => setActiveSubTab("mtbf")}
        className={`flex-1 md:flex-none flex justify-center items-center px-[clamp(0.5rem,2vw,1rem)] py-[clamp(0.5rem,1.5vw,0.75rem)] text-[clamp(0.65rem,1.5vw,0.875rem)] font-bold rounded-sm transition-all ${
          activeSubTab === "mtbf"
            ? "bg-[#DC2626] text-white shadow-md"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        }`}
      >
        <span>{t("analytics.mtbf")}</span>
      </button>
    </div>
  );

  return (
    <div className="flex flex-col gap-[clamp(1.5rem,4vw,2rem)] w-full max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[clamp(1rem,3vw,1.5rem)]">
        <div className="flex flex-col gap-2">
          <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2 leading-none">
            <BarChartIcon className="text-[#DC2626] w-[clamp(1.5rem,4vw,2rem)] h-[clamp(1.5rem,4vw,2rem)]" />
            {t("analytics.title")}
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium text-[clamp(0.75rem,2vw,0.875rem)]">
            {t("analytics.desc")}
          </p>
        </div>


      </div>

      <div className="mt-2">
        <Suspense fallback={<TabFallback />}>
          {activeSubTab === "overview" && <WeeklyReportTab tickets={tickets} getStatusBadge={getStatusBadge} nav={subTabNav} />}
          {activeSubTab === "mttr" && <ResolutionsTab tickets={tickets} getStatusBadge={getStatusBadge} nav={subTabNav} />}
          {activeSubTab === "mtbf" && <MtbfTab tickets={tickets} nav={subTabNav} />}
        </Suspense>
      </div>
    </div>
  );
}
