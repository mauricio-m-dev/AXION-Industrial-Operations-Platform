import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { Clock, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ActionModalsProps {
  t: (key: string) => string;
  startTicketId: string | null;
  setStartTicketId: (id: string | null) => void;
  assignSearch: string;
  setAssignSearch: (val: string) => void;
  usersList: any[];
  assignedToUser: string;
  setAssignedToUser: (val: string) => void;
  handleStartTicket: (id: string, assignee: string) => void;

  deleteTicketId: string | null;
  setDeleteTicketId: (id: string | null) => void;
  handleDeleteTicket: (id: string | null) => void;
}

export const ActionModals = ({
  t,
  startTicketId,
  setStartTicketId,
  assignSearch,
  setAssignSearch,
  usersList,
  assignedToUser,
  setAssignedToUser,
  handleStartTicket,
  deleteTicketId,
  setDeleteTicketId,
  handleDeleteTicket
}: ActionModalsProps) => {
  return (
    <>
      <AnimatePresence>
        {startTicketId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setStartTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-sm bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.start_service")}</h3>
                      <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1 py-0.5 rounded-sm font-bold">SYS-INIT</span>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.start_desc")}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("res.resp")}</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
                    <Input
                      placeholder={t("filter.search")}
                      value={assignSearch}
                      onChange={(e) => setAssignSearch(e.target.value)}
                      className="pl-9 h-12 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-sm text-zinc-900 dark:text-zinc-100 focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors shadow-sm w-full"
                    />
                  </div>
                  <div className="max-h-40 overflow-y-auto bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 mt-1 rounded-sm shadow-inner custom-scrollbar">
                    {usersList
                      .filter((u: any) => u.role !== "Usuário")
                      .filter((u: any) => {
                        const s = assignSearch.toLowerCase();
                        return u.username.toLowerCase().includes(s) || u.matricula.toLowerCase().includes(s);
                      })
                      .map((u: any) => (
                        <div
                          key={u.id}
                          onClick={() => setAssignedToUser(u.matricula)}
                          className={`p-3 cursor-pointer text-sm transition-colors border-b border-zinc-50 dark:border-zinc-900 last:border-0 ${assignedToUser === u.matricula ? "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold" : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"}`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{u.username}</span>
                            <span className="text-xs font-mono opacity-70">{u.matricula}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1 h-12 rounded-none text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setStartTicketId(null)}>{t("modal.cancel")}</Button>
                  <Button className="flex-1 h-12 rounded-none bg-red-600 hover:bg-red-700 text-white font-bold shadow-md shadow-red-600/20" onClick={() => handleStartTicket(startTicketId, assignedToUser)} disabled={!assignedToUser}>{t("modal.confirm_start")}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteTicketId && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDeleteTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-sm bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 transition-colors">
              <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-none flex items-center justify-center border border-red-200 dark:border-red-900/50 shrink-0">
                    <Trash2 size={20} className="animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.delete_title")}</h3>
                    </div>
                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.delete_desc")}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{t("modal.delete_confirm_text")}</p>
                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" className="flex-1 h-12 rounded-none text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setDeleteTicketId(null)}>{t("modal.cancel")}</Button>
                  <Button className="flex-1 h-12 rounded-none bg-[#DC2626] hover:bg-red-700 text-white font-bold" onClick={() => handleDeleteTicket(deleteTicketId)}>{t("modal.confirm_delete")}</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
