import React, { useCallback } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Layers, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Ticket } from "../../../types/ticket";
import { TicketRow } from "./TicketRow";

interface TicketTableProps {
  tickets: Ticket[];
  t: (key: string) => string;
  language: string;
  onRowClick: (ticket: Ticket) => void;
  emptyMessage?: string;
  totalTickets?: number;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  isCompact?: boolean;
}

export const TicketTable = React.memo(({
  tickets,
  t,
  language,
  onRowClick,
  emptyMessage,
  totalTickets = 0,
  itemsPerPage = 10,
  currentPage = 1,
  onPageChange,
  isCompact = false
}: TicketTableProps) => {
  const totalPages = Math.ceil(totalTickets / itemsPerPage);

  const handlePrev = useCallback(() => {
    if (onPageChange) onPageChange(Math.max(1, currentPage - 1));
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (onPageChange) onPageChange(Math.min(totalPages, currentPage + 1));
  }, [currentPage, totalPages, onPageChange]);

  return (
    <>
      <div className="flex-1 overflow-x-auto w-full">
        <Table className="min-w-full">
          <TableHeader className={isCompact ? "bg-red-50/80 dark:bg-red-950/40 text-red-700 dark:text-red-400" : "bg-zinc-50/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400"}>
            <TableRow className={isCompact ? "border-red-100 dark:border-red-900/30 hover:bg-transparent" : "border-zinc-100 dark:border-zinc-800 hover:bg-transparent"}>
              <TableHead className={`w-32 text-[11px] font-black uppercase tracking-wider pl-8 ${isCompact ? 'h-10 text-red-600 dark:text-red-400' : 'h-12'}`}>{t("table.proto")}</TableHead>
              <TableHead className={`text-[11px] font-black uppercase tracking-wider ${isCompact ? 'h-10 text-red-600 dark:text-red-400' : 'h-12'}`}>{t("table.occurrence")}</TableHead>
              <TableHead className={`text-[11px] font-black uppercase tracking-wider hidden sm:table-cell ${isCompact ? 'h-10 text-red-600 dark:text-red-400' : 'h-12'}`}>{t("table.time")}</TableHead>
              <TableHead className={`text-[11px] font-black uppercase tracking-wider text-right pr-8 ${isCompact ? 'h-10 text-red-600 dark:text-red-400' : 'h-12'}`}>{t("table.status")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center gap-3 text-zinc-400">
                    <Layers size={32} strokeWidth={1.5} />
                    <p className="font-bold uppercase tracking-widest text-xs">{emptyMessage || t("admin.dash.empty")}</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TicketRow
                  key={ticket.id}
                  ticket={ticket}
                  t={t}
                  language={language}
                  onClick={onRowClick}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalTickets > itemsPerPage && (
        <div className={`p-4 ${isCompact ? 'border-t border-red-100 dark:border-red-900/30 bg-red-50/30 dark:bg-red-950/10 h-12' : 'border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/30 h-16'} flex items-center justify-between shrink-0 transition-colors`}>
          <span className={`text-xs font-semibold ${isCompact ? 'text-red-700/60 dark:text-red-400/60 text-[10px] uppercase tracking-widest' : 'text-zinc-500 dark:text-zinc-400'}`}>
            {t("pagination.page")} {currentPage} {t("pagination.of")} {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentPage === 1}
              className={`p-0 rounded-sm ${isCompact ? 'h-7 w-7 border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600' : 'h-8 w-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'}`}
            >
              <ChevronLeft size={isCompact ? 14 : 16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentPage === totalPages}
              className={`p-0 rounded-sm ${isCompact ? 'h-7 w-7 border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-600' : 'h-8 w-8 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400'}`}
            >
              <ChevronRight size={isCompact ? 14 : 16} />
            </Button>
          </div>
        </div>
      )}
    </>
  );
});

TicketTable.displayName = "TicketTable";
