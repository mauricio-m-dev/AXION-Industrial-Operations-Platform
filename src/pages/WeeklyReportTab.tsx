import React, { useState, useMemo } from "react";
import { differenceInMinutes } from "date-fns";
import {
  Card
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line } from "recharts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, FileText, Search, Calendar, ChevronLeft, ChevronRight, Clock, CheckCircle2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { useTheme } from "../contexts/ThemeContext";
import { toast } from "sonner";
import { WeeklyReportPDFTemplate } from "../components/admin/WeeklyReportPDFTemplate";

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
  operator_name?: string | null;
  operator_matricula?: string | null;
  priority?: string;
  started_at?: string;
  finished_at?: string;
}

interface WeeklyReportTabProps {
  tickets: Ticket[];
  getStatusBadge: (status: string) => React.ReactNode;
  nav?: React.ReactNode;
}

const triggerSafeDownload = (blob: Blob, filename: string) => {
  const url = globalThis.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  globalThis.URL.revokeObjectURL(url);
};

export function WeeklyReportTab({ tickets, getStatusBadge, nav }: Readonly<WeeklyReportTabProps>) {
  const [reportPeriod, setReportPeriod] = useState<"last7" | "thisWeek" | "lastWeek" | "custom">("last7");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const getTranzincdType = (type: string) => {
    switch (type) {
      case "AGV com falha": return t("cat.agv");
      case "Colisão": return t("cat.colisao");
      case "Falta de peças": return t("cat.pecas");
      case "Painel/Botoeira": return t("cat.painel");
      case "Resíduos": return t("cat.residuos");
      default: return type;
    }
  };

  // Process filters
  const processedFilters = useMemo(() => {
    let start = new Date();
    let end = new Date();

    if (reportPeriod === "last7") {
      start.setDate(start.getDate() - 7);
    } else if (reportPeriod === "thisWeek") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      start.setDate(diff);
    } else if (reportPeriod === "lastWeek") {
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1) - 7;
      start.setDate(diff);
      end.setDate(diff + 6);
    } else if (reportPeriod === "custom") {
      start = startDate ? new Date(startDate) : new Date("2000-01-01");
      end = endDate ? new Date(endDate) : new Date();
    }

    // reset times for accurate comparison
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }, [reportPeriod, startDate, endDate]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      const tDate = new Date(t.created_at);
      const matchesDate = tDate >= processedFilters.start && tDate <= processedFilters.end;
      const matchesSearch =
        String(t.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.location || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(t.type || "").toLowerCase().includes(searchTerm.toLowerCase());
      return matchesDate && matchesSearch;
    });
  }, [tickets, processedFilters, searchTerm]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [reportPeriod, startDate, endDate, searchTerm]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredTickets.length;
    const closed = filteredTickets.filter(t => t.status === "Finalizado").length;
    const open = filteredTickets.filter(t => t.status === "Aberto").length;
    const pending = filteredTickets.filter(t => t.status === "Em atendimento").length;
 
    // Performance Metrics
    let totalResponseTime = 0;
    let responseCount = 0;
    let totalResolutionTime = 0;
    let resolutionCount = 0;
 
    filteredTickets.forEach(t => {
      if (t.started_at) {
        totalResponseTime += differenceInMinutes(new Date(t.started_at), new Date(t.created_at));
        responseCount++;
      }
      if (t.finished_at && t.started_at) {
        totalResolutionTime += differenceInMinutes(new Date(t.finished_at), new Date(t.started_at));
        resolutionCount++;
      }
    });
 
    const avgResponse = responseCount > 0 ? Math.round(totalResponseTime / responseCount) : 0;
    const avgResolution = resolutionCount > 0 ? Math.round(totalResolutionTime / resolutionCount) : 0;
    const efficiency = total > 0 ? Math.round((closed / total) * 100) : 0;
 
    // Métricas Industriais Avançadas
    const periodMinutes = Math.max(1, differenceInMinutes(processedFilters.end, processedFilters.start));
    const totalDowntime = filteredTickets.reduce((acc, t) => t.finished_at ? acc + differenceInMinutes(new Date(t.finished_at), new Date(t.created_at)) : acc, 0);
    const mttr = avgResolution;
    const availability = Math.max(0, Math.min(100, Math.round(((periodMinutes - totalDowntime) / periodMinutes) * 100)));
    const mtbf = total > 0 ? Math.round((periodMinutes - totalDowntime) / total) : periodMinutes;
    const criticalFailures = filteredTickets.filter(t => t.priority === "Crítico").length;
 
    const agvCounts = filteredTickets.reduce<Record<string, number>>((acc, t) => {
      if (t.agv_number) acc[t.agv_number] = (acc[t.agv_number] || 0) + 1;
      return acc;
    }, {});
 
    const agvEntries: [string, number][] = Object.entries(agvCounts);
    agvEntries.sort((a, b) => b[1] - a[1]);
    const topEquipments = agvEntries
      .slice(0, 3)
      .map(([id, count]) => `AGV #${id} (${count})`)
      .join(", ") || t("modal.none");

    const categoryCounts = filteredTickets.reduce<Record<string, number>>((acc, t) => {
      const translatedCat = getTranzincdType(t.type);
      acc[translatedCat] = (acc[translatedCat] || 0) + 1;
      return acc;
    }, {});

    let topCategory = "-";
    let max = 0;
    const catEntries: [string, number][] = Object.entries(categoryCounts);
    for (const [cat, count] of catEntries) {
      if (count > max) {
        max = count;
        topCategory = cat;
      }
    }

    return { 
      total, closed, open, pending, topCategory, 
      avgResponse, avgResolution, efficiency,
      mttr, mtbf, availability, criticalFailures, topEquipments 
    };
  }, [filteredTickets, t]);

  // Data for charts
  const chartsData = useMemo(() => {
    // By Date
    const byDateObj = filteredTickets.reduce<Record<string, { date: string; total: number; resolvidos: number; timestamp: number }>>((acc, t) => {
      const ticketDate = new Date(t.created_at);
      if (Number.isNaN(ticketDate.getTime())) return acc;

      const d = ticketDate.toLocaleDateString(language, { weekday: "short", day: "2-digit" });
      if (!acc[d]) acc[d] = { date: d, total: 0, resolvidos: 0, timestamp: ticketDate.getTime() };
      acc[d].total += 1;
      if (t.status === "Finalizado") acc[d].resolvidos += 1;
      return acc;
    }, {});
    const byDate = Object.values(byDateObj)
      .sort((a: any, b: any) => a.timestamp - b.timestamp)
      .map(({ timestamp, ...rest }: any) => rest);

    // By Category
    const categoryCounts = filteredTickets.reduce<Record<string, number>>((acc, t) => {
      const translatedCat = getTranzincdType(t.type);
      acc[translatedCat] = (acc[translatedCat] || 0) + 1;
      return acc;
    }, {});
    const catChartEntries: [string, number][] = Object.entries(categoryCounts);
    const byCategory = catChartEntries.map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    // By Status
    const byStatus = [
      { name: t("status.open"), value: stats.open, color: "#ef4444" }, // Red
      { name: t("status.progress"), value: stats.pending, color: "#ef4444" }, // Blue
      { name: t("status.finished"), value: stats.closed, color: "#10b981" }, // Green
    ].filter(s => s.value > 0);

    // Calcular média móvel de 3 pontos sobre o volume
    const byDateWithMA = byDate.map((item: any, idx: number, arr: any[]) => {
      const window = 3;
      const start = Math.max(0, idx - window + 1);
      const slice = arr.slice(start, idx + 1);
      const avg = Math.round(slice.reduce((sum: number, d: any) => sum + d.total, 0) / slice.length);
      return { ...item, media_movel: avg };
    });

    // Indicador de tendência: compara primeira e segunda metade do período
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (byDate.length >= 4) {
      const mid = Math.floor(byDate.length / 2);
      const firstHalf = byDate.slice(0, mid).reduce((s: number, d: any) => s + d.total, 0) / mid;
      const secondHalf = byDate.slice(mid).reduce((s: number, d: any) => s + d.total, 0) / (byDate.length - mid);
      const diff = ((secondHalf - firstHalf) / Math.max(firstHalf, 1)) * 100;
      if (diff > 10) trend = 'up';
      else if (diff < -10) trend = 'down';
    }

    return { byDate: byDateWithMA, byCategory, byStatus, trend };
  }, [filteredTickets, stats]);



  const exportCSV = () => {
    const headers = `ID,${t("report.cat")},${t("report.loc")},AGV,${t("modal.operator")},${t("modal.matricula")},${t("table.status")},${t("report.data")}\n`;
    const rows = filteredTickets.map(ticket =>
      `${ticket.id},"${getTranzincdType(ticket.type)}","${ticket.location}",${ticket.agv_number || ""},"${ticket.operator_name || ""}","${ticket.operator_matricula || ""}",${ticket.status},${new Date(ticket.created_at).toLocaleString(language)}`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    // deepcode ignore DOMXSS: blob URL from URL.createObjectURL is browser-controlled and cannot execute JS
    triggerSafeDownload(blob, `axion_performance_${new Date().toISOString().split('T')[0]}.csv`);
  };
 
  const generatePDFReport = async () => {
    toast.loading("Compilando relatório LaTeX profissional...", { id: "latex-gen" });
    
    try {
      const response = await fetch('/api/apm/reports/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('admin-token') || ''}`,
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          type: 'operational',
          period: reportPeriod,
          start: startDate,
          end: endDate
        })
      });

      if (!response.ok) throw new Error("Falha na geração do PDF.");

      const blob = await response.blob();
      // deepcode ignore DOMXSS: blob URL from URL.createObjectURL is browser-controlled and cannot execute JS
      triggerSafeDownload(blob, `relatorio_axion_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("Relatório (PDF) gerado com qualidade industrial.", { id: "latex-gen" });
    } catch (err: any) {
      console.warn("Failed to generate PDF, falling back to print:", err.message);
      toast.error("Servidor indisponível. Usando impressão nativa de alta fidelidade...", { id: "latex-gen" });
      const element = document.getElementById('professional-report-container');
      if (!element) return;
      element.style.display = 'block';
      globalThis.print();
      element.style.display = 'none';
    }
  };



  // Pagination variables
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="flex flex-col gap-6 md:gap-8 pb-8 print:p-0 print:gap-4 print-container">
      {/* Actions & Navigation */}
      <div className="flex flex-col lg:flex-row justify-between items-center gap-4 shrink-0">
        {nav}
        <div className="flex flex-wrap items-center gap-3 print:hidden">
          <Button onClick={generatePDFReport} className="h-10 px-6 rounded-sm font-black gap-2 shadow-md shadow-blue-500/20 bg-red-600 text-white hover:bg-red-700 transition-all active:scale-95">
            <FileText size={18} /> {t("report.generate_pdf")}
          </Button>
          <Button onClick={exportCSV} variant="outline" className="h-10 px-4 rounded-sm font-bold gap-2 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
            <Download size={16} /> CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-zinc-900 p-4 md:p-6 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col md:flex-row gap-4 items-center print:hidden transition-colors duration-300">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Calendar className="text-zinc-400" size={20} />
          <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300 whitespace-nowrap">{t("report.period")}</span>
          <Select value={reportPeriod} onValueChange={(v: any) => setReportPeriod(v)}>
            <SelectTrigger className="w-full md:w-[200px] h-10 rounded-sm font-semibold border-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100">
              <SelectValue>
                {(() => {
                  if (reportPeriod === "thisWeek") return t("report.thisWeek");
                  if (reportPeriod === "lastWeek") return t("report.lastWeek");
                  if (reportPeriod === "custom") return t("report.custom");
                  return t("report.last7");
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="rounded-sm border-zinc-200 dark:border-zinc-800 shadow-md bg-white dark:bg-zinc-950 dark:text-zinc-100 dark:shadow-none">
              <SelectItem value="last7">{t("report.last7")}</SelectItem>
              <SelectItem value="thisWeek">{t("report.thisWeek")}</SelectItem>
              <SelectItem value="lastWeek">{t("report.lastWeek")}</SelectItem>
              <SelectItem value="custom">{t("report.custom")}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {reportPeriod === "custom" && (
          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 rounded-sm border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 text-sm font-medium outline-none focus:border-[#DC2626] transition-colors"
            />
            <span className="text-zinc-400 font-bold">{t("report.to")}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 rounded-sm border border-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 text-sm font-medium outline-none focus:border-[#DC2626] transition-colors"
            />
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 shrink-0">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-sm shadow-md shadow-zinc-200/50 dark:shadow-none border-none transition-colors duration-300">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest mb-1">{t("admin.tickets")}</p>
          <p className="text-3xl font-black text-zinc-900 dark:text-zinc-100">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-sm shadow-md shadow-zinc-200/50 dark:shadow-none border-none transition-colors duration-300">
          <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1">{t("admin.critical_tickets")}</p>
          <p className="text-3xl font-black text-red-600 dark:text-red-500">{stats.criticalFailures}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 p-5 rounded-sm border border-emerald-100 dark:border-emerald-900/50 shadow-sm transition-colors duration-300">
          <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-1">{t("analytics.availability")}</p>
          <p className="text-3xl font-black text-emerald-700 dark:text-emerald-400">{stats.availability}%</p>
        </div>
        <div className="bg-zinc-900 dark:bg-zinc-800 p-5 rounded-sm border border-zinc-800 dark:border-zinc-700 shadow-sm text-white col-span-2 lg:col-span-1 transition-colors duration-300">
          <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest mb-1">{t("analytics.efficiency")}</p>
          <p className="text-3xl font-black text-emerald-400">{stats.efficiency}%</p>
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-sm shadow-md shadow-zinc-200/50 dark:shadow-none border-none col-span-2 lg:col-span-2 transition-colors duration-300">
          <p className="text-[10px] font-black uppercase text-red-500 tracking-widest mb-1">{t("analytics.most_requested")}</p>
          <p className="text-xl md:text-2xl font-black truncate text-zinc-900 dark:text-zinc-100" title={stats.topCategory}>{stats.topCategory}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-sm border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between transition-colors duration-300">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest mb-1">{t("analytics.response_time")}</p>
            <p className="text-2xl font-black text-red-600 dark:text-red-400">{stats.avgResponse} <span className="text-xs">min</span></p>
          </div>
          <Clock className="text-red-100 dark:text-red-900" size={32} />
        </div>
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-sm border border-zinc-100 dark:border-zinc-800 shadow-sm flex items-center justify-between transition-colors duration-300">
          <div>
            <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest mb-1">{t("exec.avg_time")}</p>
            <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.mttr} <span className="text-xs">min</span></p>
          </div>
          <CheckCircle2 className="text-purple-100 dark:text-purple-900" size={32} />
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm min-h-[400px] lg:col-span-2 p-0 transition-colors duration-300">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 min-h-[72px] flex items-center justify-between">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{t("admin.dash.evolution")}</h3>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-black ${(() => {
              if (chartsData.trend === 'up') return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400';
              if (chartsData.trend === 'down') return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
              return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400';
            })()}`}>
              {chartsData.trend === 'up' && <><TrendingUp size={14} /> {t("analytics.trending_up")}</>}
              {chartsData.trend === 'down' && <><TrendingDown size={14} /> {t("analytics.trending_down")}</>}
              {chartsData.trend === 'stable' && <><Minus size={14} /> {t("analytics.stable")}</>}
            </div>
          </div>
          <div className="flex-1 p-5 min-h-[300px]">
            {chartsData.byDate.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <AreaChart data={chartsData.byDate} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="colorTotalRep" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? "#18181b" : "#f1f5f9"} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748B', fontWeight: 500 }} axisLine={false} tickLine={false} dy={10} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748B', fontWeight: 500 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 600, backgroundColor: isDark ? '#09090b' : '#ffffff', color: isDark ? '#f1f5f9' : '#09090b' }}
                    cursor={{ stroke: isDark ? '#334155' : '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, paddingTop: '10px', color: isDark ? '#94a3b8' : '#475569' }} iconType="circle" />
                  <Area type="monotone" name={t("status.open")} dataKey="total" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorTotalRep)" activeDot={{ r: 6, strokeWidth: 0, fill: '#ef4444' }} animationDuration={1000} label={{ position: 'top', fontSize: 11, fontWeight: 700, fill: '#ef4444' }} />
                  <Area type="monotone" name={t("status.finished")} dataKey="resolvidos" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorRes)" activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} animationDuration={1000} label={{ position: 'top', fontSize: 11, fontWeight: 700, fill: '#10b981' }} />
                  <Line type="monotone" name={t("analytics.moving_avg")} dataKey="media_movel" stroke="#f59e0b" strokeWidth={2} strokeDasharray="6 3" dot={false} animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-medium text-zinc-400">{t("admin.dash.empty_data")}</div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm min-h-[400px] p-0 transition-colors duration-300">
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 min-h-[72px]">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{t("admin.dash.dist")}</h3>
          </div>
          <div className="flex-1 p-5 min-h-[300px]">
            {chartsData.byCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartsData.byCategory} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={isDark ? "#18181b" : "#f1f5f9"} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? '#94a3b8' : '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11, fill: isDark ? '#e2e8f0' : '#334155', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '13px', fontWeight: 600, backgroundColor: isDark ? '#09090b' : '#ffffff', color: isDark ? '#f1f5f9' : '#09090b' }}
                    itemStyle={{ color: isDark ? '#f1f5f9' : '#09090b' }}
                    cursor={{ fill: isDark ? '#18181b' : '#f8fafc' }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24} animationDuration={1000} label={{ position: 'right', fontSize: 12, fontWeight: 700, fill: '#64748b' }}>
                    {chartsData.byCategory.map((entry, index) => {
                      const isPecas = entry.name === t("cat.pecas");
                      const isColisao = entry.name === t("cat.colisao");
                      const isAgv = entry.name === t("cat.agv");
                      const isPainel = entry.name === t("cat.painel");
                      let fillColor = "#0ea5e9";
                      if (isPecas) fillColor = "#f59e0b";
                      else if (isColisao) fillColor = "#ef4444";
                      else if (isAgv) fillColor = "#8b5cf6";
                      else if (isPainel) fillColor = "#ef4444";

                      return (
                        <Cell
                          key={`cell-${entry.name}`}
                          fill={fillColor}
                        />
                      )
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-medium text-zinc-400">{t("admin.dash.empty_data")}</div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm min-h-[400px] p-0 transition-colors duration-300">
          <div className="p-5 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{t("admin.status.sys")}</h3>
          </div>
          <div className="flex-1 p-5 min-h-[300px]">
            {chartsData.byStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie
                    data={chartsData.byStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={8}
                    dataKey="value"
                    stroke="white"
                    strokeWidth={3}
                    animationDuration={1000}
                  >
                    {chartsData.byStatus.map((entry) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} stroke={isDark ? "#09090b" : "#ffffff"} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                      fontSize: '13px', 
                      fontWeight: 600,
                      backgroundColor: isDark ? '#09090b' : '#ffffff',
                      color: isDark ? '#f1f5f9' : '#09090b'
                    }}
                    itemStyle={{ color: isDark ? '#f1f5f9' : '#09090b' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: isDark ? '#94a3b8' : '#475569' }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm font-medium text-zinc-400">{t("admin.dash.empty_data")}</div>
            )}
          </div>
        </Card>
      </div>

      <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none mb-8 print:shadow-none print:border-none p-0 transition-colors duration-300">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 min-h-[80px] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-zinc-800 dark:text-zinc-100 text-sm">{t("report.detail")}</h3>
          <div className="relative w-full sm:w-64 print:hidden">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={t("report.search")}
              className="pl-9 h-10 border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950 dark:text-zinc-100 rounded-sm text-sm font-medium w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto w-full">
          <Table className="min-w-full">
            <TableHeader className="bg-zinc-50/60 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800">
              <TableRow className="hover:bg-transparent border-none">
                <TableHead className="w-24 text-[10px] font-black uppercase tracking-widest pl-6 h-12">{t("table.proto")}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 whitespace-nowrap">{t("report.cat")}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 whitespace-nowrap">{t("report.loc")} / AGV</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 whitespace-nowrap">{t("modal.operator")}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest h-12 text-center whitespace-nowrap">{t("report.data")}</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest pr-6 text-right h-12 whitespace-nowrap">{t("table.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {

                if (filteredTickets.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={5} className="h-48 text-center text-zinc-400">
                        <FileText size={32} className="mx-auto mb-3 opacity-50" />
                        <p className="font-bold text-sm tracking-wide">{t("report.empty")}</p>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <>
                    {paginatedTickets.map((ticket) => (
                      <TableRow key={ticket.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/50 border-zinc-100 dark:border-zinc-800">
                        <TableCell className="pl-6 py-4">
                          <span className="font-mono font-bold text-[#DC2626] dark:text-red-400 text-xs md:text-sm">{ticket.id}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <span className="font-bold text-zinc-800 dark:text-zinc-100 text-xs md:text-sm whitespace-nowrap">{getTranzincdType(ticket.type)}</span>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-800 dark:text-zinc-100 text-xs md:text-sm whitespace-nowrap">{ticket.location}</span>
                            {ticket.agv_number && <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">AGV #{ticket.agv_number}</span>}
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-zinc-800 dark:text-zinc-100 text-xs md:text-sm whitespace-nowrap">{ticket.operator_name || t("modal.unknown")}</span>
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase">{ticket.operator_matricula || "N/A"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4 text-center">
                          <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 block">
                            {new Date(ticket.created_at).toLocaleDateString(language, { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                          <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500">
                            {new Date(ticket.created_at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 py-4 text-right">
                          <div className="flex justify-end">{getStatusBadge(ticket.status)}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                );
              })()}
            </TableBody>
          </Table>
        </div>

        {filteredTickets.length > itemsPerPage && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30 print:hidden">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {t("pagination.page")} {currentPage} {t("pagination.of")} {Math.ceil(filteredTickets.length / itemsPerPage)}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
              >
                <ChevronLeft size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTickets.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredTickets.length / itemsPerPage)}
                className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <WeeklyReportPDFTemplate stats={stats} filteredTickets={filteredTickets} getTranzincdType={getTranzincdType} />
    </div>
  );
}
