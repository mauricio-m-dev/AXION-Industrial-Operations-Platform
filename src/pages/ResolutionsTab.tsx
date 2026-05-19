import React, { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, PenTool, CheckCircle, Eye, Search, X, ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "motion/react";
import { sanitizeImageSrc } from "../utils/sanitize";
import DOMPurify from "dompurify";

interface Ticket {
  id: string;
  type: string;
  location: string;
  status: string;
  assigned_to?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  resolution_report?: string | null;
  resolution_image_path?: string | null;
  operator_name?: string | null;
  operator_matricula?: string | null;
  [key: string]: any;
}

interface Props {
  tickets: Ticket[];
  getStatusBadge: (status: string) => React.ReactNode;
  nav?: React.ReactNode;
}

export function ResolutionsTab({ tickets, getStatusBadge, nav }: Props) {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket =>
      (ticket.status === "Em atendimento" || ticket.status === "Finalizado") &&
      (
        String(ticket.id || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(ticket.assigned_to || "").toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [tickets, searchTerm]);

  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const calculateMTTR = (start: string | null | undefined, end: string | null | undefined) => {
    if (!start) return { text: "-", color: "text-zinc-400 dark:text-zinc-500", bg: "bg-zinc-100 dark:bg-zinc-800", labelColor: "bg-zinc-500" };

    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : new Date().getTime();

    const diffMs = endTime - startTime;
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    let text = "";
    if (hours > 0) text += `${hours}h `;
    text += `${mins}m`;

    if (diffMins <= 30) return { text, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-950/40", labelColor: "bg-emerald-500" };
    if (diffMins <= 60) return { text, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-950/40", labelColor: "bg-amber-500" };
    return { text, color: "text-red-700 dark:text-red-400", bg: "bg-red-100 dark:bg-red-950/40", labelColor: "bg-red-500" };
  };

  // Ranking de Técnicos por Performance
  const techRanking = useMemo(() => {
    const techStats: Record<string, { name: string; total: number; totalMTTR: number; slaCompliant: number }> = {};

    tickets.forEach(ticket => {
      if (!ticket.assigned_to || ticket.status !== "Finalizado" || !ticket.finished_at) return;
      const tech = ticket.assigned_to;
      if (!techStats[tech]) {
        techStats[tech] = { name: tech, total: 0, totalMTTR: 0, slaCompliant: 0 };
      }
      techStats[tech].total++;
      const start = ticket.started_at ? new Date(ticket.started_at) : new Date(ticket.created_at);
      const mttr = (new Date(ticket.finished_at).getTime() - start.getTime()) / 60000;
      if (mttr >= 0) {
        techStats[tech].totalMTTR += mttr;
        if (mttr <= 30) techStats[tech].slaCompliant++;
      }
    });

    return Object.values(techStats)
      .filter(t => t.total >= 1)
      .map(t => ({
        ...t,
        avgMTTR: Math.round(t.totalMTTR / t.total),
        slaPercent: Math.round((t.slaCompliant / t.total) * 100)
      }))
      .sort((a, b) => a.avgMTTR - b.avgMTTR) // Melhor MTTR primeiro
      .slice(0, 5);
  }, [tickets]);

  const maxVolume = techRanking.length > 0 ? Math.max(...techRanking.map(t => t.total)) : 1;
  const medals = ['🥇', '🥈', '🥉'];

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto">
      <div className="flex justify-between items-center print:hidden">
        {nav}
      </div>

      {/* Top Performers Card */}
      {techRanking.length > 0 && (
        <Card className="p-6 rounded-none bg-white dark:bg-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none border-none transition-colors duration-300">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-sm flex items-center justify-center transition-colors">
              <Trophy size={20} />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{t("res.top_performers")}</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t("res.top_performers_desc")}</p>
            </div>
          </div>
          <div className="space-y-3">
            {techRanking.map((tech, idx) => (
              <div key={tech.name} className="flex items-center gap-4 p-3 rounded-sm bg-zinc-50/50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                <span className="text-xl w-8 text-center shrink-0">{medals[idx] || `#${idx + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate">{tech.name}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400">{tech.total} {t("res.finalized")}</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        tech.avgMTTR <= 15 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : tech.avgMTTR <= 30 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>{tech.avgMTTR}m MTTR</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${
                        tech.slaPercent >= 80 ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                      }`}>{tech.slaPercent}% SLA</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-zinc-200 dark:bg-zinc-700 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-700 ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-zinc-400' : idx === 2 ? 'bg-orange-600' : 'bg-red-500'
                      }`}
                      style={{ width: `${(tech.total / maxVolume) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="flex flex-col border-none rounded-sm bg-white dark:bg-zinc-900 shadow-md shadow-zinc-200/50 dark:shadow-none overflow-hidden p-0 transition-colors duration-300">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 min-h-[80px] transition-colors duration-300">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={t("res.search")}
              className="pl-9 h-10 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-sm focus:border-[#DC2626] shadow-sm transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-x-auto w-full">
          <Table className="min-w-full">
            <TableHeader className="bg-white dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-32 text-[11px] font-black uppercase tracking-wider pl-6 h-12 text-zinc-400">{t("res.protocol")}</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">{t("res.resp")}</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">{t("res.start")}</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">{t("res.end")}</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">MTTR</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider h-12 text-right pr-6 text-zinc-400">{t("audit.action")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(() => {
                const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
                const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                if (filteredTickets.length === 0) {
                  return (
                    <TableRow>
                      <TableCell colSpan={6} className="h-40 text-center">
                        <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                          <PenTool size={32} strokeWidth={1.5} className="opacity-50" />
                          <p className="font-bold uppercase tracking-widest text-xs opacity-60">{t("res.empty")}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                }

                return (
                  <>
                    {paginatedTickets.map((ticket) => {
                      const mttrInfo = calculateMTTR(ticket.started_at, ticket.finished_at);
                      return (
                        <TableRow key={ticket.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors border-zinc-100 dark:border-zinc-800">
                          <TableCell className="pl-6 py-4">
                            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 block text-sm">{ticket.id}</span>
                            <div className="mt-1">{getStatusBadge(ticket.status)}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">{ticket.assigned_to || t("res.unassigned")}</span>
                          </TableCell>
                          <TableCell className="py-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {formatDate(ticket.started_at)}
                          </TableCell>
                          <TableCell className="py-4 text-sm font-medium text-zinc-500 dark:text-zinc-400">
                            {formatDate(ticket.finished_at)}
                          </TableCell>
                          <TableCell className="py-4">
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm ${mttrInfo.bg} ${mttrInfo.color} font-bold text-xs`}>
                              <Clock size={12} />
                              {mttrInfo.text}
                            </div>
                          </TableCell>
                          <TableCell className="pr-6 py-4 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedTicket(ticket)}
                              className="text-zinc-400 dark:text-zinc-500 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-sm h-8"
                            >
                              <Eye size={16} className="mr-2" /> {t("res.details")}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </>
                );
              })()}
            </TableBody>
          </Table>
        </div>

        {filteredTickets.length > itemsPerPage && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30 shrink-0 h-16 transition-colors duration-300">
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

      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="relative w-full max-w-4xl bg-white dark:bg-[#0A0A0C] border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header Modal */}
              <div className="p-6 md:p-10 border-b border-zinc-100 dark:border-zinc-800/80 flex justify-between items-start bg-zinc-50 dark:bg-zinc-950 shrink-0">
                <div className="flex items-start gap-5">
                  <div className="h-14 w-14 rounded-none bg-red-100 dark:bg-red-950/40 text-[#DC2626] dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center justify-center shrink-0">
                    <CheckCircle size={28} strokeWidth={2.5} />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-3">
                      <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight uppercase">{t("res.report")}</h3>
                      <div className="px-3 py-1 bg-zinc-900 dark:bg-zinc-800 text-white border border-zinc-800 rounded-none font-mono font-bold text-sm tracking-tighter shadow-sm">
                        {selectedTicket.id}
                      </div>
                    </div>
                    <p className="text-sm font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest opacity-70">{t("res.subtitle")}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => setSelectedTicket(null)}
                  className="h-10 w-10 p-0 rounded-none text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-900 transition-all active:scale-95 shrink-0"
                >
                  <X size={24} />
                </Button>
              </div>
 
              {/* Body Modal */}
              <div className="p-6 md:p-10 overflow-y-auto custom-scrollbar space-y-10 bg-white dark:bg-[#0C0C0E]">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-5 rounded-none bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 space-y-2">
                    <p className="text-[10px] font-black uppercase text-red-400 tracking-widest flex items-center gap-2">
                      <PenTool size={12} /> {t("res.resp")}
                    </p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100">{selectedTicket.assigned_to || "-"}</p>
                  </div>
                  
                  <div className="p-5 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                      <Eye size={12} /> {t("modal.operator")}
                    </p>
                    <p className="font-bold text-zinc-900 dark:text-zinc-100 truncate" title={selectedTicket.operator_name || ""}>
                      {selectedTicket.operator_name || "???"}
                    </p>
                  </div>
 
                  <div className="p-5 rounded-none bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800/80 space-y-2">
                    <p className="text-[10px] font-black uppercase text-zinc-400 tracking-widest flex items-center gap-2">
                      <Clock size={12} /> {t("res.start")} / {t("res.end")}
                    </p>
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{formatDate(selectedTicket.started_at)}</p>
                      <p className="text-xs font-bold text-zinc-400">{formatDate(selectedTicket.finished_at)}</p>
                    </div>
                  </div>
 
                  <div className="p-5 rounded-none bg-zinc-900 dark:bg-[#121214] border border-zinc-800 dark:border-zinc-700 space-y-2 shadow-md dark:shadow-none transition-colors">
                    <p className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest">{t("exec.avg_time")}</p>
                    {(() => {
                      const mttr = calculateMTTR(selectedTicket.started_at, selectedTicket.finished_at);
                      return (
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${mttr.labelColor}`} />
                          <p className="text-xl font-black text-white">{mttr.text}</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
 
                {/* Technical Report Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-1 bg-[#DC2626] rounded-full" />
                    <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                      {t("res.report")}
                    </h4>
                  </div>
                  <div className="bg-zinc-50 dark:bg-zinc-950 p-7 rounded-none border border-zinc-100 dark:border-zinc-800/80 shadow-inner group transition-all hover:bg-white dark:hover:bg-zinc-900 hover:shadow-md">
                    <p className="text-base font-medium text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed italic">
                      "{selectedTicket.resolution_report || t("res.no_report")}"
                    </p>
                  </div>
                </div>
  
                {/* Evidence Photo */}
                {selectedTicket.resolution_image_path && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-1 bg-emerald-500 rounded-full" />
                      <h4 className="text-sm font-black uppercase tracking-widest text-zinc-900 dark:text-zinc-100">
                        {t("res.photo")}
                      </h4>
                    </div>
                    <div className="group relative rounded-none overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-2xl bg-zinc-100 dark:bg-zinc-900">
                      {/* deepcode ignore DOMXSS: URL validated by sanitizeImageSrc strict allowlist */}
                      <img src={DOMPurify.sanitize(sanitizeImageSrc(selectedTicket.resolution_image_path))} alt={t("res.report")} className="w-full h-auto object-contain max-h-[500px] transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                        <span className="text-white text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                          <Eye size={14} /> {t("res.details")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
  
              {/* Footer Modal */}
              <div className="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/80 flex justify-end shrink-0">
                <Button
                  onClick={() => setSelectedTicket(null)}
                  className="bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold px-8 h-12 rounded-none shadow-md transition-all"
                >
                  {t("modal.cancel")}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
