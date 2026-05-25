import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { PenTool, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Ticket } from "../../../types/ticket";

interface EditTicketModalProps {
  t: (key: string) => string;
  editTicketId: string | null;
  setEditTicketId: (id: string | null) => void;
  editFormData: Partial<Ticket>;
  setEditFormData: (data: Partial<Ticket>) => void;
  handleEditTicket: (id: string, data: Partial<Ticket>) => void;
}

export const EditTicketModal = ({
  t,
  editTicketId,
  setEditTicketId,
  editFormData,
  setEditFormData,
  handleEditTicket
}: EditTicketModalProps) => {
  return (
    <AnimatePresence>
      {editTicketId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEditTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-lg bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors">
            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                  <PenTool size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.edit_title")}</h3>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.edit_desc")}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t("modal.proto")}</label>
                  <Input value={editFormData.id || ''} disabled className="bg-zinc-100 dark:bg-zinc-900 border-none rounded-sm font-mono text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t("modal.type")}</label>
                  <select 
                    value={editFormData.type || ''} 
                    onChange={e => setEditFormData({...editFormData, type: e.target.value})}
                    className="flex h-10 w-full rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="AGV com falha">{t("cat.agv")}</option>
                    <option value="Falta de peças">{t("cat.pecas")}</option>
                    <option value="Painel/Botoeira">{t("cat.painel")}</option>
                    <option value="Resíduos">{t("cat.residuos")}</option>
                    <option value="Colisão">{t("cat.colisao")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500"><AlertCircle size={12} className="inline mr-1"/>{t("modal.loc")}</label>
                <Input 
                  value={editFormData.location || ''} 
                  onChange={e => setEditFormData({...editFormData, location: e.target.value})}
                  className="rounded-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t("modal.priority")}</label>
                  <select 
                    value={editFormData.priority || ''} 
                    onChange={e => setEditFormData({...editFormData, priority: e.target.value})}
                    className="flex h-10 w-full rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="Baixo">Baixo</option>
                    <option value="Médio">Médio</option>
                    <option value="Alto">Alto</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t("op.impact")}</label>
                  <select 
                    value={editFormData.operational_impact || ''} 
                    onChange={e => setEditFormData({...editFormData, operational_impact: e.target.value})}
                    className="flex h-10 w-full rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500"
                  >
                    <option value="none">{t("op.impact.none")}</option>
                    <option value="partial">{t("op.impact.partial")}</option>
                    <option value="total">{t("op.impact.total")}</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{t("modal.obs")}</label>
                <textarea 
                  value={editFormData.observation || ''} 
                  onChange={e => setEditFormData({...editFormData, observation: e.target.value})}
                  className="flex min-h-[80px] w-full rounded-sm border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-red-500 custom-scrollbar"
                />
              </div>
            </div>
            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800 flex gap-3">
              <Button variant="ghost" className="flex-1 rounded-sm" onClick={() => setEditTicketId(null)}>{t("modal.cancel")}</Button>
              <Button className="flex-1 rounded-sm bg-[#DC2626] hover:bg-red-700 text-white" onClick={() => handleEditTicket(editTicketId, editFormData)}>{t("modal.save")}</Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
