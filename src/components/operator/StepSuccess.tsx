import React from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, MessageSquare } from "lucide-react";

interface StepSuccessProps {
  t: (key: string) => string;
  ticketId: string;
  feedbackSent: boolean;
  feedbackText: string;
  setFeedbackText: (text: string) => void;
  handleSendFeedback: () => void;
  resetForm: () => void;
}

export const StepSuccess = ({
  t,
  ticketId,
  feedbackSent,
  feedbackText,
  setFeedbackText,
  handleSendFeedback,
  resetForm
}: StepSuccessProps) => {
  return (
    <motion.div 
      key="success"
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-center w-full max-w-[min(500px,95vw)] mx-auto flex flex-col items-center my-auto px-4"
    >
      <div className="mb-[clamp(1.5rem,4vw,2rem)]">
         <CheckCircle2 className="w-[clamp(4rem,10vw,5rem)] h-[clamp(4rem,10vw,5rem)] text-green-500 mx-auto" />
      </div>
      <h1 className="text-[clamp(1.5rem,5vw,2rem)] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight mb-1">{t("op.success.title")}</h1>
      <p className="text-[clamp(0.65rem,1.5vw,0.75rem)] text-zinc-400 dark:text-zinc-500 font-semibold uppercase tracking-widest mb-[clamp(2rem,6vw,3rem)]">{t("op.success.subtitle")}</p>
      
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-sm p-[clamp(1.5rem,4vw,2rem)] mb-[clamp(2rem,6vw,3rem)] w-full shadow-sm transition-colors duration-300">
        <p className="text-[clamp(0.6rem,1.5vw,0.65rem)] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-[0.2em] mb-3">{t("op.protocol")}</p>
        <p className="text-[clamp(2.5rem,8vw,3.5rem)] font-black text-[#DC2626] dark:text-red-400 tabular-nums tracking-tight">{ticketId}</p>
      </div>

      {!feedbackSent ? (
        <div className="w-full bg-red-50/50 dark:bg-red-900/10 border border-[#DC2626]/20 dark:border-red-500/20 rounded-sm p-[clamp(1.25rem,4vw,1.75rem)] mb-[clamp(2rem,6vw,3rem)] text-left transition-colors">
          <div className="flex items-center gap-3 mb-4">
            <MessageSquare className="text-[#DC2626] dark:text-red-400" size={20} />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{t("feed.rate")}</h3>
              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-widest">{t("feed.improve")}</p>
            </div>
          </div>
          <Textarea 
            placeholder={t("feed.placeholder")}
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            className="mb-4 bg-white dark:bg-zinc-950 dark:text-zinc-100 dark:border-zinc-800"
          />
          <Button 
            onClick={handleSendFeedback}
            data-track="true"
            data-action="SEND_FEEDBACK"
            disabled={!feedbackText.trim()}
            className="w-full h-[clamp(3rem,8vw,3.5rem)] bg-[#DC2626] dark:bg-red-600 hover:bg-[#B91C1C] dark:hover:bg-red-700 text-white font-bold text-[clamp(0.75rem,2vw,0.875rem)] rounded-sm transition-all"
          >
            {t("feed.send")}
          </Button>
        </div>
      ) : (
        <div className="w-full bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 rounded-sm p-[clamp(1rem,3vw,1.5rem)] mb-[clamp(2rem,6vw,3rem)] transition-colors">
          <p className="text-[clamp(0.875rem,2.5vw,1rem)] font-bold text-green-700 dark:text-green-400">{t("feed.thanks")}</p>
        </div>
      )}

      <Button 
        className="w-full h-[clamp(3.5rem,8vw,4rem)] text-[clamp(0.6rem,1.5vw,0.75rem)] font-bold uppercase tracking-widest rounded-sm bg-zinc-900 dark:bg-red-600 hover:bg-zinc-800 dark:hover:bg-red-700 text-white shadow-md transition-all"
        onClick={resetForm}
      >
        {t("op.new_ticket")}
      </Button>
    </motion.div>
  );
};
