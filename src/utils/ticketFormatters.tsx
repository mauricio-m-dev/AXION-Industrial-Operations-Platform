import React from "react";
import { Badge } from "@/components/ui/badge";

export const getTranzincdType = (type: string, t: (k: string) => string) => {
  switch (type) {
    case "AGV com falha": return t("cat.agv");
    case "Colisão": return t("cat.colisao");
    case "Falta de peças": return t("cat.pecas");
    case "Painel/Botoeira": return t("cat.painel");
    case "Resíduos": return t("cat.residuos");
    default: return type;
  }
};

export const getStatusBadge = (status: string, t: (k: string) => string) => {
  switch (status) {
    case "Aberto": return <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50 font-bold px-3 py-1">{t("status.open")}</Badge>;
    case "Em atendimento": return <Badge className="bg-red-50 text-red-600 hover:bg-red-50 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-900/50 font-bold px-3 py-1">{t("status.progress")}</Badge>;
    case "Finalizado": return <Badge className="bg-zinc-100 text-zinc-500 hover:bg-zinc-100 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700 font-bold px-3 py-1">{t("status.finished")}</Badge>;
    default: return <Badge className="font-bold px-3 py-1">{status}</Badge>;
  }
};

export const getPriorityBadge = (priority: string | undefined, t: (k: string) => string) => {
  if (!priority) return null;
  switch (priority) {
    case "Crítico": return <Badge className="bg-red-600 text-white hover:bg-red-700 font-bold px-1.5 py-0 border-none shadow-sm animate-pulse ml-2 text-[9px] uppercase tracking-widest">{t("priority.critical")}</Badge>;
    case "Alto": return <Badge className="bg-orange-500 text-white hover:bg-orange-600 font-bold px-1.5 py-0 border-none shadow-sm ml-2 text-[9px] uppercase tracking-widest">{t("priority.high")}</Badge>;
    case "Médio": return <Badge className="bg-amber-400 text-white hover:bg-amber-500 font-bold px-1.5 py-0 border-none shadow-sm ml-2 text-[9px] uppercase tracking-widest">{t("priority.medium")}</Badge>;
    case "Baixo": return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 font-bold px-1.5 py-0 border-none shadow-sm ml-2 text-[9px] uppercase tracking-widest">{t("priority.low")}</Badge>;
    default: return null;
  }
};
