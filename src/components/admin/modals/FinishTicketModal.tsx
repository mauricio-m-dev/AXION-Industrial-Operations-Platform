import React, { useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FinishTicketModalProps {
  t: (key: string) => string;
  finishTicketId: string | null;
  setFinishTicketId: (id: string | null) => void;
  resolutionReport: string;
  setResolutionReport: (val: string) => void;
  resolutionImage: File | null;
  setResolutionImage: (file: File | null) => void;
  handleFinishTicket: (id: string, report: string, image: File | null) => void;
  finishing: boolean;
}

export const FinishTicketModal = ({
  t,
  finishTicketId,
  setFinishTicketId,
  resolutionReport,
  setResolutionReport,
  resolutionImage,
  setResolutionImage,
  handleFinishTicket,
  finishing
}: FinishTicketModalProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResolutionImage(e.target.files[0]);
    }
  };

  return (
    <AnimatePresence>
      {finishTicketId && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFinishTicketId(null)} className="absolute inset-0 bg-zinc-950/70 backdrop-blur-md" />
          <motion.div initial={{ scale: 0.98, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.98, opacity: 0, y: 10 }} className="relative w-full max-w-md bg-white dark:bg-[#0A0A0C] rounded-none shadow-2xl overflow-hidden border-l-4 border-l-emerald-500 border border-zinc-200 dark:border-zinc-800 transition-colors">
            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-none flex items-center justify-center border border-emerald-200 dark:border-emerald-900/50 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-base text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">{t("modal.finish_title")}</h3>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{t("modal.finish_desc")}</p>
                </div>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("modal.resolution_report")}</label>
                <textarea
                  placeholder={t("modal.report_placeholder")}
                  value={resolutionReport}
                  onChange={(e) => setResolutionReport(e.target.value)}
                  className="w-full h-32 p-3 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 font-medium text-sm text-zinc-900 dark:text-zinc-100 focus:border-emerald-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors shadow-inner resize-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400">{t("modal.resolution_image")} ({t("modal.optional")})</label>
                <div 
                  className={`border-2 border-dashed ${resolutionImage ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-zinc-300 dark:border-zinc-700 hover:border-emerald-500 hover:bg-emerald-50/10 dark:hover:bg-emerald-900/10'} rounded-none p-4 text-center cursor-pointer transition-colors group`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input type="file" ref={fileInputRef} className="hidden" accept="image/jpeg,image/png,image/webp" onChange={handleFileChange} />
                  <UploadCloud size={24} className={`mx-auto mb-2 ${resolutionImage ? 'text-emerald-500' : 'text-zinc-400 group-hover:text-emerald-500'}`} />
                  <p className={`text-sm font-bold ${resolutionImage ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-500 dark:text-zinc-400'}`}>
                    {resolutionImage ? resolutionImage.name : t("modal.click_upload")}
                  </p>
                  {resolutionImage && (
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setResolutionImage(null); }} className="mt-2 h-6 text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-0">
                      <X size={12} className="mr-1" /> {t("modal.remove_image")}
                    </Button>
                  )}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1 h-12 rounded-none text-zinc-500 dark:text-zinc-400 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800" onClick={() => setFinishTicketId(null)} disabled={finishing}>{t("modal.cancel")}</Button>
                <Button 
                  className="flex-1 h-12 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md shadow-emerald-600/20 relative" 
                  onClick={() => handleFinishTicket(finishTicketId, resolutionReport, resolutionImage)} 
                  disabled={!resolutionReport || finishing}
                >
                  {finishing ? (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-5 w-5 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    </div>
                  ) : t("modal.confirm_finish")}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
