import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, PenTool, Trash2, X, Eye, Settings } from "lucide-react";
import DOMPurify from "dompurify";
import { Ticket } from "../../../types/ticket";
import { DetailItem } from "../DetailItem";
import { StatusActionButton } from "../StatusActionButton";
import { sanitizeImageSrc } from "../../../utils/sanitize";
import { getTranzincdType, getPriorityBadge, getStatusBadge } from "../../../utils/ticketFormatters";

interface TicketDetailModalProps {
  selectedTicket: Ticket | null;
  setSelectedTicket: (ticket: Ticket | null) => void;
  userRole: string;
  t: (key: string) => string;
  setEditTicketId: (id: string | null) => void;
  setEditFormData: (data: Partial<Ticket>) => void;
  setDeleteTicketId: (id: string | null) => void;
  updateStatus: (id: string, status: string) => void;
  setStartTicketId: (id: string | null) => void;
  handleStartTicket: (id: string) => void;
  setFinishTicketId: (id: string | null) => void;
}

export default function TicketDetailModal({
  selectedTicket,
  setSelectedTicket,
  userRole,
  t,
  setEditTicketId,
  setEditFormData,
  setDeleteTicketId,
  updateStatus,
  setStartTicketId,
  handleStartTicket,
  setFinishTicketId
}: TicketDetailModalProps) {
  if (!selectedTicket) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-end overflow-hidden p-0 md:p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setSelectedTicket(null)}
          className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md"
        />
        <motion.div
          initial={{ x: "100%", opacity: 0.5 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: "100%", opacity: 0.5 }}
          transition={{ type: "spring", damping: 30, stiffness: 300 }}
          className="relative w-full max-w-xl h-full bg-white dark:bg-[#0A0A0C] shadow-2xl md:rounded-none overflow-hidden flex flex-col border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors duration-300"
        >
          <div className="p-[clamp(1.5rem,4vw,2rem)] border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-start bg-zinc-50 dark:bg-zinc-950 shrink-0">
            <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
              <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)] flex-wrap">
                <Badge className="bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 border-none font-bold font-mono tracking-widest text-[clamp(0.6rem,1.5vw,0.75rem)] px-2 py-1">{selectedTicket.id}</Badge>
                {getStatusBadge(selectedTicket.status, t)}
                {getPriorityBadge(selectedTicket.priority, t)}
              </div>
              <h2 className="text-[clamp(1.5rem,4vw,2rem)] font-bold text-zinc-900 dark:text-white tracking-tight leading-none">{getTranzincdType(selectedTicket.type, t)}</h2>
              <p className="text-zinc-500 dark:text-zinc-400 font-medium text-[clamp(0.65rem,1.5vw,0.75rem)] flex items-center gap-2">
                <AlertCircle size={14} className="text-red-500" /> {selectedTicket.location}
              </p>
            </div>
            <div className="flex items-center gap-[clamp(0.25rem,1vw,0.5rem)]">
              {(userRole === "SuperAdmin" || userRole === "Admin") && (
                <>
                  <Button variant="outline" size="sm" onClick={() => { setEditTicketId(selectedTicket.id); setEditFormData(selectedTicket); }} className="h-10 w-10 p-0 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    <PenTool size={16} />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleteTicketId(selectedTicket.id)} className="h-10 w-10 p-0 text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 rounded-full border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
                    <Trash2 size={16} />
                  </Button>
                </>
              )}
              <Button
                variant="ghost"
                onClick={() => setSelectedTicket(null)}
                className="rounded-full h-10 w-10 p-0 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors text-zinc-400 hover:text-zinc-900 dark:hover:text-white shrink-0 ml-2"
              >
                <X size={20} />
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-[clamp(1.5rem,4vw,2rem)] space-y-[clamp(1.5rem,4vw,2rem)] bg-white dark:bg-zinc-900 transition-colors">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,2rem)]">
              <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                <DetailItem label="AGV" value={selectedTicket.agv_number ? `AGV #${selectedTicket.agv_number}` : "N/A"} color="text-[#DC2626] dark:text-red-400" />
              </div>
              <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                <DetailItem label={t("modal.date")} value={new Date(selectedTicket.created_at).toLocaleString('pt-BR')} />
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,2rem)]">
              <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                <DetailItem label={t("op.impact")} value={selectedTicket.operational_impact ? t(`op.impact.${selectedTicket.operational_impact}`) : "-"} />
              </div>
              <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                <DetailItem label={t("op.downtime")} value={selectedTicket.downtime ? t(`op.downtime.${selectedTicket.downtime}`) : "-"} />
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,2rem)]">
              <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                <DetailItem label={t("modal.operator")} value={selectedTicket.operator_name || t("modal.unknown")} />
              </div>
              <div className="p-[clamp(1rem,3vw,1.5rem)] rounded-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 transition-colors">
                <DetailItem label={t("modal.matricula")} value={selectedTicket.operator_matricula || "N/A"} />
              </div>
            </div>

            {selectedTicket.type === "Falta de peças" && (
              <div className="p-[clamp(1rem,3vw,1.5rem)] bg-amber-50/50 dark:bg-amber-900/10 rounded-sm border border-amber-100 dark:border-amber-900/30 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-[clamp(1rem,3vw,1.5rem)] transition-colors">
                <DetailItem label={t("modal.part")} value={selectedTicket.part_name || "-"} />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(80px,1fr))] gap-[clamp(0.5rem,1.5vw,1rem)]">
                  <DetailItem label={t("op.sap")} value={selectedTicket.sap_number || "-"} />
                  <DetailItem label={t("modal.side")} value={selectedTicket.side || "-"} />
                </div>
              </div>
            )}

            <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
              <h3 className="text-[clamp(0.55rem,1.5vw,0.65rem)] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest flex items-center gap-2"><PenTool size={12} /> {t("modal.obs")}</h3>
              <div className="bg-zinc-50/80 dark:bg-zinc-950 p-[clamp(1rem,3vw,1.5rem)] rounded-sm border border-zinc-100 dark:border-zinc-800 min-h-[80px] shadow-sm transition-colors">
                <p className="text-zinc-700 dark:text-zinc-300 text-[clamp(0.875rem,2.5vw,1rem)] font-medium leading-relaxed whitespace-pre-wrap">{selectedTicket.observation || t("modal.no_obs")}</p>
              </div>
            </div>

            {selectedTicket.image_path && (
              <div className="space-y-3">
                <h3 className="text-[10px] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest flex items-center gap-2"><Eye size={12} /> {t("op.step3.visual")}</h3>
                <div className="rounded-sm overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shadow-md transition-colors">
                  <img src={DOMPurify.sanitize(sanitizeImageSrc(selectedTicket.image_path))} alt="Evidência" className="w-full h-auto object-contain max-h-[300px] hover:scale-[1.02] transition-transform duration-500" />
                </div>
              </div>
            )}
          </div>

          <div className="p-[clamp(1.5rem,4vw,2rem)] bg-zinc-50/80 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 shrink-0 transition-colors">
            <p className="text-[clamp(0.55rem,1.5vw,0.65rem)] font-black uppercase text-zinc-400 dark:text-zinc-500 tracking-widest mb-[clamp(1rem,3vw,1.5rem)] flex items-center gap-2 justify-center"><Settings size={12} /> {t("modal.update_status")}</p>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-[clamp(0.5rem,1.5vw,1rem)]">
              <StatusActionButton
                label={t("status.open")}
                active={selectedTicket.status === "Aberto"}
                onClick={() => updateStatus(selectedTicket.id, "Aberto")}
                activeColor="bg-[#DC2626] shadow-md shadow-blue-500/30"
              />
              <StatusActionButton
                label={t("status.progress")}
                active={selectedTicket.status === "Em atendimento"}
                onClick={() => {
                  if (userRole === "SuperAdmin" || userRole === "Admin") {
                    setStartTicketId(selectedTicket.id);
                  } else {
                    handleStartTicket(selectedTicket.id);
                  }
                }}
                activeColor="bg-red-600 shadow-md shadow-blue-600/30"
              />
              <StatusActionButton
                label={t("status.finished")}
                active={selectedTicket.status === "Finalizado"}
                onClick={() => {
                  const username = localStorage.getItem("admin-username") || "";
                  if (userRole === "SuperAdmin" || userRole === "Admin" || selectedTicket.assigned_to === username) {
                    setFinishTicketId(selectedTicket.id);
                  } else {
                    alert(t("toast.finish_error_auth") || "Apenas o responsável pelo atendimento, Admin ou SuperAdmin podem finalizar este chamado.");
                  }
                }}
                activeColor="bg-zinc-900 dark:bg-zinc-800 shadow-md shadow-zinc-900/30 dark:shadow-none"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
