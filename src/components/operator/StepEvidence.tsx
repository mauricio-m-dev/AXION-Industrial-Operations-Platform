import React from "react";
import { motion } from "motion/react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Camera } from "lucide-react";

interface StepEvidenceProps {
  t: (key: string) => string;
  formData: any;
  setFormData: (data: any) => void;
  imagePreview: string | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: () => void;
  submitting: boolean;
}

export const StepEvidence = ({
  t,
  formData,
  setFormData,
  imagePreview,
  handleFileChange,
  handleSubmit,
  submitting
}: StepEvidenceProps) => {
  return (
    <motion.div
      key="step3"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="w-full max-w-[min(600px,95vw)] mx-auto flex flex-col my-auto gap-[clamp(1.5rem,4vw,2rem)]"
    >
      <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
        <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
          <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.step3.visual")} <span className="text-zinc-400 dark:text-zinc-500 text-[10px] lowercase font-normal">(opcional)</span></Label>
          <label className="flex flex-col items-center justify-center h-[clamp(10rem,25vw,14rem)] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-sm cursor-pointer bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-[#DC2626]/40 dark:hover:border-red-500/50 hover:shadow-md transition-all group overflow-hidden relative">
            {imagePreview ? (
              <div className="absolute inset-0 w-full h-full">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto mb-2" />
                </div>
              </div>
            ) : formData.image ? (
              <div className="text-center">
                <CheckCircle2 className="w-8 h-8 text-green-500 dark:text-green-400 mx-auto mb-2" />
                <p className="text-[9px] font-bold text-zinc-600 dark:text-zinc-300 uppercase tracking-widest">{t("op.file_attached")}</p>
              </div>
            ) : (
              <div className="text-center">
                <Camera className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-1 group-hover:text-[#DC2626] dark:group-hover:text-red-400 transition-colors" />
                <p className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">{t("op.capture")}</p>
              </div>
            )}
            <input type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileChange} />
          </label>
        </div>

        <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
           <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.obs")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
           <Textarea
            placeholder={t("op.obs.placeholder")}
            value={formData.observation}
            onChange={(e) => setFormData({...formData, observation: e.target.value})}
            className="min-h-[clamp(120px,15vh,200px)] rounded-sm border border-zinc-200 dark:border-zinc-800 p-[clamp(1rem,3vw,1.5rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-medium bg-white dark:bg-zinc-950 dark:text-zinc-100 focus:border-[#DC2626] dark:focus:border-red-500 focus:ring-2 focus:ring-[#DC2626]/20 shadow-sm transition-all"
           />
        </div>
      </div>

      <Button 
        onClick={handleSubmit}
        data-track="true"
        data-action="OPEN_TICKET"
        disabled={submitting || !formData.observation.trim()}
        className="h-[clamp(3.5rem,8vw,4rem)] w-full rounded-sm bg-[#DC2626] dark:bg-red-600 text-white font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vw,0.75rem)] hover:bg-[#B91C1C] dark:hover:bg-red-700 transition-all shadow-md mt-2 disabled:opacity-70"
      >
        {submitting ? t("op.sending") : t("op.finish")}
      </Button>
    </motion.div>
  );
};
