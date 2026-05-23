import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ListFilter, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "../contexts/LanguageContext";

interface LogEntry {
  id: string;
  action: string;
  username: string;
  details: any;
  timestamp: string;
}

export function AuditLogsTab() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { t } = useLanguage();

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/logs", {
        headers: { }
      });
      if (response.status === 401) {
        localStorage.removeItem("admin-token");
        window.location.href = `/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`;
        return;
      }
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error("Failed to fetch logs", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log =>
    String(log.username || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(log.action || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || "")).toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getActionBadge = (action: string) => {
    switch (action) {
      case "LOGIN": return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-none px-2 py-0">{t("audit.badge.login")}</Badge>;
      case "OPEN_TICKET": return <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none px-2 py-0">{t("audit.badge.open")}</Badge>;
      case "START_SERVICE": return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none px-2 py-0">{t("audit.badge.start")}</Badge>;
      case "FINISH_SERVICE": return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none px-2 py-0">{t("audit.badge.finish")}</Badge>;
      case "CHANGE_STATUS": return <Badge className="bg-zinc-200 text-zinc-700 hover:bg-zinc-200 border-none px-2 py-0">{t("audit.badge.status")}</Badge>;
      case "UI_CLICK": return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-2 py-0">UI Click</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  const formatDetails = (details: any) => {
    if (!details) return "-";
    let parsed = details;
    if (typeof details === "string") {
      try {
        parsed = JSON.parse(details);
      } catch (e) {
        return details;
      }
    }
    if (typeof parsed === "object" && parsed !== null) {
      const entries = Object.entries(parsed);
      if (entries.length === 0) return "-";
      return entries.map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(", ");
    }
    return String(details);
  };

  return (
    <div className="flex flex-col gap-8 w-full">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{t("audit.title")}</h2>
        <p className="text-zinc-500 dark:text-zinc-400 font-medium text-sm">{t("audit.subtitle")}</p>
      </div>

      <Card className="flex flex-col border border-zinc-200 dark:border-zinc-800 rounded-sm bg-white dark:bg-zinc-900 shadow-sm dark:shadow-none overflow-hidden p-0 transition-colors duration-300">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 min-h-[80px] transition-colors duration-300">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <Input
              placeholder={t("audit.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-sm focus:border-[#DC2626] transition-all text-sm shadow-sm"
            />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-800 px-3 py-2 rounded-sm border border-zinc-200 dark:border-zinc-700 shadow-sm dark:shadow-none shrink-0 transition-colors">
            <ListFilter size={14} />
            {filteredLogs.length} {t("audit.records")}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto w-full">
          <Table className="min-w-full">
            <TableHeader className="bg-white dark:bg-zinc-800 border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-40 text-[11px] font-black uppercase tracking-wider pl-6 h-12 text-zinc-400">{t("audit.datetime")}</TableHead>
                <TableHead className="w-32 text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">{t("audit.user")}</TableHead>
                <TableHead className="w-32 text-[11px] font-black uppercase tracking-wider h-12 text-zinc-400">{t("audit.action")}</TableHead>
                <TableHead className="text-[11px] font-black uppercase tracking-wider pr-6 h-12 text-zinc-400">{t("audit.details")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center">
                    <Loader2 className="animate-spin h-8 w-8 text-zinc-300 mx-auto" />
                  </TableCell>
                </TableRow>
              ) : (
                (() => {
                  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
                  const paginated = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                  if (filteredLogs.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={4} className="h-40 text-center text-zinc-500 text-sm font-medium">
                          {t("audit.empty")}
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return (
                    <>
                      {paginated.map((log) => (
                        <TableRow key={log.id} className="hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50 transition-colors border-zinc-100 dark:border-zinc-800">
                          <TableCell className="pl-6 py-4">
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                              {new Date(log.timestamp).toLocaleString("pt-BR")}
                            </span>
                          </TableCell>
                          <TableCell className="py-4">
                            <span className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{log.username}</span>
                          </TableCell>
                          <TableCell className="py-4">
                            {getActionBadge(log.action)}
                          </TableCell>
                          <TableCell className="pr-6 py-4">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 font-mono bg-zinc-50 dark:bg-zinc-950 p-1.5 rounded border border-zinc-100 dark:border-zinc-800 block break-all max-h-20 overflow-y-auto">
                              {formatDetails(log.details)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </>
                  );
                })()
              )}
            </TableBody>
          </Table>
        </div>

        {!loading && filteredLogs.length > itemsPerPage && (
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30 shrink-0 h-16 transition-colors duration-300">
            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
              {t("pagination.page")} {currentPage} {t("pagination.of")} {Math.ceil(filteredLogs.length / itemsPerPage)}
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
                onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredLogs.length / itemsPerPage), p + 1))}
                disabled={currentPage === Math.ceil(filteredLogs.length / itemsPerPage)}
                className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
              >
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
