import React from "react";
import { motion } from "motion/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface StepIdentificationProps {
  t: (key: string) => string;
  operatorInfo: any;
  setOperatorInfo: (info: any) => void;
  submitting: boolean;
  handleOperatorLogin: () => void;
}

export const StepIdentification = ({
  t,
  operatorInfo,
  setOperatorInfo,
  submitting,
  handleOperatorLogin
}: StepIdentificationProps) => {
  return (
    <motion.div
      key="step0"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-[min(400px,95vw)] mx-auto flex flex-col my-auto"
    >
      <div className="mb-4 text-center space-y-1">
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{t("op.identification")}</h2>
        <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("op.enter_data")}</p>
      </div>

      <div className="space-y-4 bg-white dark:bg-zinc-900 p-6 rounded-sm border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="space-y-2">
          <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("login.matricula")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
          <Input 
            placeholder={t("op.your_id")}
            value={operatorInfo.matricula}
            maxLength={7}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '');
              if (val.length <= 7) {
                setOperatorInfo({...operatorInfo, matricula: val});
              }
            }}
            className="h-[clamp(3rem,8vw,3.5rem)] font-semibold rounded-sm border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#DC2626] dark:focus:border-red-500 focus:ring-2 focus:ring-[#DC2626]/20 dark:text-zinc-100 transition-all w-full"
            disabled={submitting}
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("login.password")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
          <Input 
            placeholder="******"
            type="password"
            value={operatorInfo.password}
            onChange={(e) => setOperatorInfo({...operatorInfo, password: e.target.value})}
            className="h-[clamp(3rem,8vw,3.5rem)] font-semibold rounded-sm border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:bg-white dark:focus:bg-zinc-900 focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 transition-all w-full"
            disabled={submitting}
          />
        </div>

        <Button 
          onClick={handleOperatorLogin}
          data-track="true"
          data-action="OPERATOR_LOGIN"
          disabled={operatorInfo.matricula.length !== 7 || !operatorInfo.password || submitting}
          className="h-[clamp(3.5rem,8vw,4rem)] w-full rounded-sm bg-zinc-900 dark:bg-red-600 text-white font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vw,0.75rem)] hover:bg-zinc-800 dark:hover:bg-red-700 transition-all shadow-md mt-[clamp(1rem,4vw,1.5rem)]"
        >
          {submitting ? t("op.sending") : t("op.continue")}
        </Button>
      </div>
    </motion.div>
  );
};
