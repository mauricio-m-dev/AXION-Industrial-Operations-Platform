import React, { useMemo } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { AlertTriangle, Clock, Settings, Gauge } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useTheme } from "../contexts/ThemeContext";

interface Ticket {
  id: string;
  agv_number: string | null;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  status: string;
  type: string;
  [key: string]: any;
}

interface Props {
  tickets: Ticket[];
  nav?: React.ReactNode;
}

export function MtbfTab({ tickets, nav }: Props) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const agvStats = useMemo(() => {
    const stats: Record<string, { count: number; first: Date; last: Date; totalRepairMin: number; finishedCount: number; recurringIn7d: number }> = {};
    
    tickets.forEach(ticket => {
      if (!ticket.agv_number) return;
      
      const date = new Date(ticket.created_at);
      if (!stats[ticket.agv_number]) {
        stats[ticket.agv_number] = { count: 1, first: date, last: date, totalRepairMin: 0, finishedCount: 0, recurringIn7d: 0 };
      } else {
        stats[ticket.agv_number].count++;
        if (date < stats[ticket.agv_number].first) stats[ticket.agv_number].first = date;
        if (date > stats[ticket.agv_number].last) stats[ticket.agv_number].last = date;
      }

      // Calcula tempo de reparo (MTTR por AGV)
      if (ticket.status === "Finalizado" && ticket.finished_at && ticket.started_at) {
        const repairMin = (new Date(ticket.finished_at).getTime() - new Date(ticket.started_at).getTime()) / 60000;
        if (repairMin > 0) {
          stats[ticket.agv_number].totalRepairMin += repairMin;
          stats[ticket.agv_number].finishedCount++;
        }
      }
    });

    // Detecta reincidência em 7 dias por AGV
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    tickets.forEach(ticket => {
      if (ticket.agv_number && new Date(ticket.created_at) >= sevenDaysAgo) {
        if (stats[ticket.agv_number]) stats[ticket.agv_number].recurringIn7d++;
      }
    });

    return Object.entries(stats).map(([agv, data]) => {
      // MTBF (Mean Time Between Failures) em horas
      let mtbf = 0;
      if (data.count > 1) {
        const diffMs = data.last.getTime() - data.first.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        mtbf = diffHours / (data.count - 1);
      }

      // MTTR médio por AGV em minutos
      const mttrAvg = data.finishedCount > 0 ? data.totalRepairMin / data.finishedCount : 0;

      // OEE = Disponibilidade × Performance × Qualidade
      // Disponibilidade: (Tempo Total - Tempo Parado) / Tempo Total
      const totalHours = data.count > 1 ? (data.last.getTime() - data.first.getTime()) / 3600000 : 24;
      const totalDowntimeHours = data.totalRepairMin / 60;
      const availability = totalHours > 0 ? Math.max(0, Math.min(1, (totalHours - totalDowntimeHours) / totalHours)) : 1;

      // Performance: MTBF / (MTBF + MTTR)
      const mttrHours = mttrAvg / 60;
      const performance = (mtbf > 0 && mttrHours >= 0) ? mtbf / (mtbf + mttrHours) : (data.count === 0 ? 1 : 0.5);

      // Qualidade: (Tickets sem reincidência) / Total
      const quality = data.count > 0 ? Math.max(0, Math.min(1, 1 - (data.recurringIn7d > 1 ? (data.recurringIn7d - 1) / data.count : 0))) : 1;

      const oee = Math.round(availability * performance * quality * 100);

      return {
        agv,
        count: data.count,
        mtbf: mtbf > 0 ? parseFloat(mtbf.toFixed(1)) : 0,
        mttrAvg: Math.round(mttrAvg),
        oee: Math.max(0, Math.min(100, oee))
      };
    }).sort((a, b) => b.count - a.count);
  }, [tickets]);

  // OEE global (média ponderada de todos os AGVs)
  const globalOEE = useMemo(() => {
    if (agvStats.length === 0) return 0;
    const totalWeight = agvStats.reduce((sum, s) => sum + s.count, 0);
    const weightedOEE = agvStats.reduce((sum, s) => sum + s.oee * s.count, 0);
    return totalWeight > 0 ? Math.round(weightedOEE / totalWeight) : 0;
  }, [agvStats]);

  const topProblematic = agvStats.slice(0, 5);

  const [currentPage, setCurrentPage] = React.useState(1);
  const itemsPerPage = 5;

  const totalPages = Math.ceil(agvStats.length / itemsPerPage);
  const paginatedStats = agvStats.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center print:hidden">
        {nav}
      </div>

      {/* OEE Global Card */}
      <Card className="p-6 rounded-none bg-white dark:bg-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none border-none transition-colors duration-300">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke={isDark ? '#18181b' : '#e2e8f0'} strokeWidth="10" />
              <circle 
                cx="50" cy="50" r="42" fill="none" 
                stroke={globalOEE >= 85 ? '#10b981' : globalOEE >= 65 ? '#f59e0b' : '#ef4444'} 
                strokeWidth="10" 
                strokeLinecap="round"
                strokeDasharray={`${globalOEE * 2.64} ${264 - globalOEE * 2.64}`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-black text-zinc-900 dark:text-white tabular-nums">{globalOEE}%</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Gauge size={20} className="text-red-600 dark:text-red-400" />
              <h3 className="font-black text-lg text-zinc-900 dark:text-zinc-100">{t("mtbf.oee_global")}</h3>
              <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                globalOEE >= 85 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                : globalOEE >= 65 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {globalOEE >= 85 ? 'World Class' : globalOEE >= 65 ? t("mtbf.acceptable") : t("mtbf.critical")}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium mb-3">
              {t("mtbf.oee_desc")}
            </p>
            <div className="flex gap-4">
              {agvStats.slice(0, 3).map(s => (
                <div key={s.agv} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.oee >= 85 ? 'bg-emerald-500' : s.oee >= 65 ? 'bg-amber-500' : 'bg-red-500'}`} />
                  <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">{s.agv}: {s.oee}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Problematic AGVs Chart */}
        <Card className="p-6 rounded-none bg-white dark:bg-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none border-none flex flex-col min-h-[400px] transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-sm flex items-center justify-center transition-colors">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{t("mtbf.ranking")}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t("mtbf.ranking_desc")}</p>
            </div>
          </div>
          
          <div className="flex-1 min-h-[300px]">
            {topProblematic.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={topProblematic} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#18181b" : "#E2E8F0"} />
                  <XAxis dataKey="agv" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748B', fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: isDark ? '#94a3b8' : '#64748B' }} />
                  <Tooltip
                    cursor={{ fill: isDark ? '#18181b' : '#F1F5F9' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      backgroundColor: isDark ? '#09090b' : '#ffffff',
                      color: isDark ? '#f1f5f9' : '#09090b'
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                    {topProblematic.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : index === 1 ? '#F97316' : '#F59E0B'} />
                    ))}
                    <LabelList dataKey="count" position="top" style={{ fill: isDark ? '#94a3b8' : '#475569', fontSize: '12px', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-400 font-medium text-sm">
                {t("admin.dash.empty_data")}
              </div>
            )}
          </div>
        </Card>

        {/* MTBF List */}
        <Card className="p-0 rounded-none bg-white dark:bg-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none border-none overflow-hidden flex flex-col transition-colors duration-300">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-sm flex items-center justify-center transition-colors">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{t("mtbf.title")}</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t("mtbf.desc")}</p>
              </div>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto custom-scrollbar p-6 min-h-[480px]">
            <div className="space-y-4">
              {paginatedStats.map((stat, idx) => (
                <div key={stat.agv} className="flex items-center justify-between p-4 rounded-sm border border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors group">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-sm bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-black text-zinc-700 dark:text-zinc-300 shadow-sm transition-colors">
                      #{(currentPage - 1) * itemsPerPage + idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">{t("mtbf.agv_number")} {stat.agv}</h4>
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        <Settings size={12} /> {stat.count} {t("mtbf.total_tickets")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-black text-lg text-zinc-900 dark:text-zinc-100 tabular-nums">
                        {stat.mtbf > 0 ? stat.mtbf : "-"}
                      </p>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                        {t("mtbf.value")}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-sm flex items-center justify-center text-xs font-black ${
                      stat.oee >= 85 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                      : stat.oee >= 65 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {stat.oee}%
                    </div>
                  </div>
                </div>
              ))}
              
              {agvStats.length === 0 && (
                <div className="text-center text-zinc-400 font-medium text-sm py-8">
                  {t("admin.dash.empty_data")}
                </div>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-bold rounded-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {t("common.previous")}
              </button>
              <span className="text-[10px] font-black uppercase tracking-tighter text-zinc-400 dark:text-zinc-500">
                {t("common.page")} {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-bold rounded-sm border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                {t("common.next")}
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
