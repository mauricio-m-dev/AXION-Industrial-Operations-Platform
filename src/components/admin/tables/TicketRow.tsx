import React from "react";
import { TableRow, TableCell } from "@/components/ui/table";
import { AlertCircle, ChevronRight } from "lucide-react";
import { Ticket } from "../../../types/ticket";
import { getTranzincdType, getPriorityBadge, getStatusBadge } from "../../../utils/ticketFormatters";

interface TicketRowProps {
  ticket: Ticket;
  t: (key: string) => string;
  language: string;
  onClick: (ticket: Ticket) => void;
}

export const TicketRow = React.memo(({ ticket, t, language, onClick }: TicketRowProps) => {
  return (
    <TableRow
      className="cursor-pointer group border-zinc-100 dark:border-zinc-800 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/50"
      onClick={() => onClick(ticket)}
    >
      <TableCell className="pl-8 py-5">
        <span className="font-mono font-bold text-[#DC2626] dark:text-red-400 block text-sm">{ticket.id}</span>
      </TableCell>
      <TableCell className="py-5">
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm whitespace-nowrap flex items-center">
            {getTranzincdType(ticket.type, t)}
            {getPriorityBadge(ticket.priority, t)}
          </span>
          <span className="text-[12px] text-zinc-500 dark:text-zinc-400 font-medium flex items-center gap-1.5"><AlertCircle size={14} className="text-zinc-400 dark:text-zinc-500" /> {ticket.location}</span>
          {(ticket.operator_name || ticket.operator_matricula) && (
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
              {t("modal.operator")}: {ticket.operator_name || "???"} ({ticket.operator_matricula || "N/A"})
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell py-5">
        <span className="text-sm font-semibold text-zinc-600 dark:text-zinc-300 whitespace-nowrap">
          {new Date(ticket.created_at).toLocaleTimeString(language, { hour: '2-digit', minute: '2-digit' })}
          <span className="ml-2 text-zinc-400 dark:text-zinc-500 font-medium text-xs">({new Date(ticket.created_at).toLocaleDateString(language, { day: '2-digit', month: '2-digit' })})</span>
        </span>
      </TableCell>
      <TableCell className="pr-8 py-5 text-right">
        <div className="flex items-center justify-end gap-4">
          {getStatusBadge(ticket.status, t)}
          <ChevronRight size={18} className="text-zinc-300 dark:text-zinc-600 group-hover:text-[#DC2626] dark:group-hover:text-red-400 transition-colors" />
        </div>
      </TableCell>
    </TableRow>
  );
});

TicketRow.displayName = "TicketRow";
