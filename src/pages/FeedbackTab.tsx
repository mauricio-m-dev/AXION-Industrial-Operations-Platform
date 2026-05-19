import React, { useState, useEffect } from "react";
import { Search, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useLanguage } from "../contexts/LanguageContext";

interface Feedback {
  id: string;
  matricula: string;
  name: string;
  feedback: string;
  created_at: string;
}

export function FeedbackTab() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const { t } = useLanguage();

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const fetchFeedbacks = async () => {
    try {
      const res = await fetch("/api/feedback", {
        headers: { "Authorization": `Bearer ${localStorage.getItem("admin-token")}` }
      });
      if (res.status === 401) {
        localStorage.removeItem("admin-token");
        window.location.href = `/${(import.meta as any).env.VITE_ADMIN_PATH || "admin"}/login`;
        return;
      }
      const data = await res.json();
      if (Array.isArray(data)) {
        setFeedbacks(data);
      }
    } catch (e) {
      toast.error(t("error.fetch_feedbacks"));
    } finally {
      setLoading(false);
    }
  };

  const filteredFeedbacks = feedbacks.filter(f =>
    String(f.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(f.matricula || "").includes(searchTerm) ||
    String(f.feedback || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight flex items-center gap-2">
            <MessageSquare className="text-[#DC2626] dark:text-red-400" size={28} />
            {t("feed.title")}
          </h1>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mt-1">
            {t("feed.subtitle")}
          </p>
        </div>
      </div>

      <Card className="border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-none rounded-sm overflow-hidden bg-white dark:bg-zinc-900 p-0 transition-colors duration-300">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex flex-row items-center justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0 min-h-[80px] transition-colors duration-300">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 dark:text-zinc-500" />
            <Input
              placeholder={t("feed.search")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 dark:text-zinc-100 rounded-sm focus:border-[#DC2626] focus:ring-[#DC2626]/20 transition-all shadow-sm"
            />
          </div>
        </div>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 dark:text-zinc-400 font-medium text-sm">{t("state.loading")}</div>
          ) : (
            <div className="flex-1 overflow-x-auto">
              <Table>
                <TableHeader className="bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-b border-zinc-100 dark:border-zinc-800 transition-colors duration-300">
                  <TableRow className="hover:bg-transparent border-none">
                    <TableHead className="w-48 font-black text-xs uppercase tracking-wider pl-6">{t("feed.date")}</TableHead>
                    <TableHead className="w-64 font-black text-xs uppercase tracking-wider">{t("feed.op")}</TableHead>
                    <TableHead className="font-black text-xs uppercase tracking-wider">{t("feed.comment")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const totalPages = Math.ceil(filteredFeedbacks.length / itemsPerPage);
                    const paginated = filteredFeedbacks.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

                    if (filteredFeedbacks.length === 0) {
                      return (
                        <TableRow>
                          <TableCell colSpan={3} className="h-32 text-center text-zinc-500 dark:text-zinc-400 text-sm">
                            {t("feed.empty")}
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                      <>
                        {paginated.map((f) => (
                          <TableRow key={f.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-b border-zinc-100 dark:border-zinc-800 transition-colors">
                            <TableCell className="pl-6 py-4">
                              <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 block">
                                {new Date(f.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              <span className="text-xs text-zinc-400 dark:text-zinc-500">
                                {new Date(f.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </TableCell>
                            <TableCell className="py-4">
                              <span className="font-bold text-zinc-900 dark:text-zinc-100 block text-sm">{f.name}</span>
                              <span className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">{t("login.matricula")}: {f.matricula}</span>
                            </TableCell>
                            <TableCell className="py-4">
                              <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{f.feedback}</p>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })()}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filteredFeedbacks.length > itemsPerPage && (
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/30 dark:bg-zinc-900/30 shrink-0 h-16 transition-colors duration-300">
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {t("pagination.page")} {currentPage} {t("pagination.of")} {Math.ceil(filteredFeedbacks.length / itemsPerPage)}
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
                  onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredFeedbacks.length / itemsPerPage), p + 1))}
                  disabled={currentPage === Math.ceil(filteredFeedbacks.length / itemsPerPage)}
                  className="h-8 w-8 p-0 rounded-sm border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
                >
                  <ChevronRight size={16} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
