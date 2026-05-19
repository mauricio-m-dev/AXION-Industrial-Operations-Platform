import React, { useMemo, useEffect } from "react";
import { Layers, Activity, AlertTriangle, Clock, TrendingUp, Shield, Zap, PackageOpen, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { format, differenceInMinutes } from "date-fns";
import { useLanguage } from "../contexts/LanguageContext";
import { io } from "socket.io-client";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Ticket {
  id: string;
  type: string;
  location: string;
  status: string;
  created_at: string;
  priority: string;
  downtime?: string;
  started_at?: string;
  finished_at?: string;
  agv_number?: string;
}

export default function ExecutivePage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading: loading } = useQuery({
    queryKey: ['executiveTickets'],
    queryFn: async () => {
      const response = await fetch("/api/tickets", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("admin-token")}` }
      });
      if (response.status === 401) {
        localStorage.removeItem("admin-token");
        window.location.href = `/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`;
        return [];
      }
      return await response.json();
    }
  });

  useEffect(() => {
    const role = localStorage.getItem("admin-role");
    if (!localStorage.getItem("admin-token") || role === "Usuário") {
      localStorage.removeItem("admin-token");
      window.location.href = `/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`;
      return;
    }

    const socket = io("/tenant-axion", { transports: ["websocket"] });
    socket.on("connect", () => {
      socket.emit("authenticate", { token: localStorage.getItem("admin-token") });
    });

    // Debounce de 500ms para evitar refetchs redundantes em atualizações em rajada
    let debounceTimer: ReturnType<typeof setTimeout>;
    socket.on("tickets_updated", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['executiveTickets'] });
      }, 500);
    });

    return () => {
      clearTimeout(debounceTimer);
      socket.disconnect();
    };
  }, [queryClient]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const todayTickets = tickets.filter(t => new Date(t.created_at).toDateString() === today);
    
    const open = tickets.filter(t => t.status === "Aberto").length;
    const progress = tickets.filter(t => t.status === "Em atendimento").length;
    const finished = tickets.filter(t => t.status === "Finalizado").length;
    
    let totalMTTR = 0;
    let finishedWithMTTR = 0;
    let slaCompliant = 0;
    let totalFRT = 0;
    let frtCount = 0;

    tickets.forEach(t => {
      if (t.status === "Finalizado" && t.finished_at) {
        const start = t.started_at ? new Date(t.started_at) : new Date(t.created_at);
        const diff = differenceInMinutes(new Date(t.finished_at), start);
        if (diff >= 0) {
          totalMTTR += diff;
          finishedWithMTTR++;
          if (diff <= 30) slaCompliant++;
        }
      }
      // First Response Time (FRT): tempo entre criação e início do atendimento
      if (t.started_at) {
        const frt = differenceInMinutes(new Date(t.started_at), new Date(t.created_at));
        if (frt >= 0) {
          totalFRT += frt;
          frtCount++;
        }
      }
    });
    
    const avgMTTR = finishedWithMTTR > 0 ? Math.round(totalMTTR / finishedWithMTTR) : 0;
    const slaPercent = finishedWithMTTR > 0 ? Math.round((slaCompliant / finishedWithMTTR) * 100) : 100;
    const avgFRT = frtCount > 0 ? Math.round(totalFRT / frtCount) : 0;

    // Backlog: tickets abertos ou em atendimento com mais de 60 min
    const backlog = tickets.filter(t => {
      if (t.status === "Finalizado") return false;
      const age = differenceInMinutes(new Date(), new Date(t.created_at));
      return age > 60;
    }).length;

    // Eficiência por turno (baseada em finalizações)
    const shifts = { morning: 0, afternoon: 0, night: 0 };
    tickets.forEach(t => {
      if (t.status === "Finalizado" && t.finished_at) {
        const hour = new Date(t.finished_at).getHours();
        if (hour >= 6 && hour < 14) shifts.morning++;
        else if (hour >= 14 && hour < 22) shifts.afternoon++;
        else shifts.night++;
      }
    });
    const bestShift = shifts.morning >= shifts.afternoon && shifts.morning >= shifts.night
      ? "06-14h" : shifts.afternoon >= shifts.night ? "14-22h" : "22-06h";
    const bestShiftCount = Math.max(shifts.morning, shifts.afternoon, shifts.night);
    
    return { total: todayTickets.length, open, progress, finished, avgMTTR, slaPercent, avgFRT, backlog, bestShift, bestShiftCount };
  }, [tickets]);

  const typeData = useMemo(() => {
    const counts = tickets.reduce((acc, t) => {
      acc[t.type] = (acc[t.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return Object.keys(counts).map(k => ({ name: k, value: counts[k] })).sort((a,b) => b.value - a.value).slice(0, 5);
  }, [tickets]);

  if (loading) return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans p-6 md:p-8 flex flex-col">
      <header className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="h-7 w-28 bg-zinc-800 rounded-sm animate-pulse" />
            <div className="h-3 w-48 bg-zinc-800 rounded mt-2 animate-pulse" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-8 w-20 bg-zinc-800 rounded-sm animate-pulse ml-auto" />
          <div className="h-3 w-24 bg-zinc-800 rounded mt-2 animate-pulse ml-auto" />
        </div>
      </header>
      <div className="grid grid-cols-4 gap-6 mb-6 shrink-0">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
              <div className="h-7 w-7 bg-zinc-800 rounded-sm animate-pulse" />
            </div>
            <div className="h-12 w-24 bg-zinc-800 rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        {[1,2,3,4].map(i => (
          <div key={i} className="bg-zinc-900/60 border border-zinc-800/50 rounded-sm px-5 py-4">
            <div className="h-3 w-20 bg-zinc-800 rounded animate-pulse mb-2" />
            <div className="h-6 w-16 bg-zinc-800 rounded-sm animate-pulse" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="col-span-2 bg-zinc-900 border border-zinc-800 rounded-sm p-6">
          <div className="h-4 w-40 bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (<div key={i} className="h-8 bg-zinc-800 rounded-sm animate-pulse" style={{ width: `${90 - i * 12}%` }} />))}
          </div>
        </div>
        <div className="col-span-1 bg-zinc-900 border border-zinc-800 rounded-sm p-6">
          <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse mb-6" />
          <div className="space-y-3">
            {[1,2,3].map(i => (<div key={i} className="h-16 bg-zinc-800/50 rounded-sm animate-pulse" />))}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans p-6 md:p-8 flex flex-col">
      <header className="flex justify-between items-center mb-8 shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-white">
                AXION
              </h1>
              <span className="hidden min-[350px]:inline-flex text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-850 dark:bg-zinc-900 px-1.5 py-0.5 rounded-none border border-zinc-700/50 dark:border-zinc-800/50">
                <span className="hidden sm:inline">{t("app.free_license")}</span>
                <span className="inline sm:hidden">{t("app.free_license_short")}</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{t("exec.subtitle")}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-black tabular-nums">{format(new Date(), "HH:mm")}</p>
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">{format(new Date(), "dd MMM yyyy")}</p>
        </div>
      </header>

      <div className="grid grid-cols-4 gap-6 mb-6 shrink-0">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 rounded-sm p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-base font-bold text-zinc-400 uppercase tracking-widest">{t("exec.volume_today")}</h3>
            <Layers className="text-red-500" size={28} />
          </div>
          <div className="flex items-baseline gap-4 relative z-10">
            <p className="text-6xl font-black text-white tabular-nums">{stats.total}</p>
            <p className="text-sm font-bold text-zinc-500 uppercase">{t("exec.total_geral")}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 rounded-sm p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-base font-bold text-zinc-400 uppercase tracking-widest">{t("status.progress")}</h3>
            <Activity className="text-red-500" size={28} />
          </div>
          <div className="flex items-baseline gap-4 relative z-10">
            <p className="text-6xl font-black text-white tabular-nums">{stats.progress}</p>
            <p className="text-sm font-bold text-zinc-500 uppercase">{t("exec.abertos_stats")} {stats.open}</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 rounded-sm p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-red-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-base font-bold text-zinc-400 uppercase tracking-widest">{t("exec.critical_active")}</h3>
            <AlertTriangle className="text-red-500 animate-pulse" size={28} />
          </div>
          <div className="flex items-baseline gap-4 relative z-10">
            <p className="text-6xl font-black text-white tabular-nums">
              {tickets.filter(t => t.priority === "Crítico" && t.status !== "Finalizado").length}
            </p>
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-zinc-500 uppercase">{t("exec.prioridade_max")}</p>
              {tickets.filter(t => t.priority === "Crítico" && t.status !== "Finalizado").length > 0 && (
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 rounded-sm p-8 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <h3 className="text-base font-bold text-zinc-400 uppercase tracking-widest">{t("exec.avg_time")}</h3>
            <Clock className="text-emerald-500" size={28} />
          </div>
          <div className="flex items-baseline gap-3 relative z-10">
            <p className="text-6xl font-black text-white tabular-nums">{stats.avgMTTR}</p>
            <p className="text-base font-bold text-zinc-500">{t("exec.min")}</p>
          </div>
        </div>
      </div>

      {/* Secondary KPI Strip — SLA, FRT, Backlog, Turno */}
      <div className="grid grid-cols-4 gap-4 mb-6 shrink-0">
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-sm px-5 py-4 flex items-center gap-4">
          <Shield className={`shrink-0 ${stats.slaPercent >= 80 ? 'text-emerald-500' : stats.slaPercent >= 50 ? 'text-amber-500' : 'text-red-500'}`} size={22} />
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("exec.sla")}</p>
            <p className="text-2xl font-black text-white tabular-nums">{stats.slaPercent}<span className="text-sm text-zinc-500 ml-0.5">%</span></p>
          </div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-sm px-5 py-4 flex items-center gap-4">
          <Zap className="text-amber-500 shrink-0" size={22} />
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("exec.frt")}</p>
            <p className="text-2xl font-black text-white tabular-nums">{stats.avgFRT}<span className="text-sm text-zinc-500 ml-1">{t("exec.min")}</span></p>
          </div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-sm px-5 py-4 flex items-center gap-4">
          <PackageOpen className={`shrink-0 ${stats.backlog > 5 ? 'text-red-500' : stats.backlog > 0 ? 'text-amber-500' : 'text-emerald-500'}`} size={22} />
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("exec.backlog")}</p>
            <p className="text-2xl font-black text-white tabular-nums">{stats.backlog}</p>
          </div>
        </div>
        <div className="bg-zinc-900/60 border border-zinc-800/50 rounded-sm px-5 py-4 flex items-center gap-4">
          <BarChart3 className="text-red-500 shrink-0" size={22} />
          <div>
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{t("exec.best_shift")}</p>
            <p className="text-2xl font-black text-white tabular-nums">{stats.bestShift} <span className="text-sm text-zinc-500">({stats.bestShiftCount})</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
        <div className="col-span-2 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 rounded-sm p-6 flex flex-col relative">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 relative z-10">{t("exec.top_occurrences")}</h3>
          <div className="flex-1 min-h-0 min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={typeData} layout="vertical" margin={{ top: 0, right: 30, left: 40, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#18181b" horizontal={false} />
                <XAxis type="number" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} width={120} />
                <Tooltip cursor={{ fill: '#18181b' }} contentStyle={{ backgroundColor: '#09090b', border: '1px solid #18181b', borderRadius: '12px' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32} label={{ position: 'right', fontSize: 12, fontWeight: 700, fill: '#cbd5e1' }}>
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? "#DC2626" : "#334155"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="col-span-1 bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 shadow-2xl shadow-black/50 rounded-sm p-6 flex flex-col overflow-hidden relative">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6 relative z-10">{t("exec.stopped_assets")}</h3>
          <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#334155 transparent' }}>
            {tickets.filter(t => t.status !== "Finalizado" && t.agv_number).length === 0 ? (
               <div className="h-full flex items-center justify-center text-zinc-500 text-sm font-medium">{t("exec.all_operational")}</div>
            ) : (
              tickets.filter(ticket => ticket.status !== "Finalizado" && ticket.agv_number).slice(0, 4).map(ticket => (
                <div key={ticket.id} className="bg-zinc-800/50 rounded-sm p-4 border border-zinc-700/50 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-white block">AGV #{ticket.agv_number}</span>
                    <span className="text-xs text-zinc-400 font-bold uppercase">{ticket.location}</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-black uppercase px-2 py-1 rounded-md ${ticket.priority === 'Crítico' ? 'bg-red-500/20 text-red-400' : 'bg-orange-500/20 text-orange-400'}`}>
                      {differenceInMinutes(new Date(), new Date(ticket.created_at))} {t("exec.m_stopped")}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
          {tickets.filter(t => t.status !== "Finalizado" && t.agv_number).length > 4 && (
            <div className="pt-3 border-t border-zinc-800 text-center mt-auto">
              <span className="text-xs font-bold text-zinc-500">+ {tickets.filter(t => t.status !== "Finalizado" && t.agv_number).length - 4} {t("exec.outros_pendentes")}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
