import React from "react";
import { motion } from "motion/react";
import { Package, Zap, AlertTriangle, Trash2, Settings } from "lucide-react";

interface StepTypeProps {
  t: (key: string) => string;
  handleTypeSelect: (type: string) => void;
}

export const StepType = ({ t, handleTypeSelect }: StepTypeProps) => {
  const PROBLEM_TYPES = [
    { id: "AGV com falha", label: t("cat.agv"), icon: Zap, color: "bg-red-600", desc: t("cat.agv.desc") },
    { id: "Colisão", label: t("cat.colisao"), icon: AlertTriangle, color: "bg-black", desc: t("cat.colisao.desc") },
    { id: "Falta de peças", label: t("cat.pecas"), icon: Package, color: "bg-red-800", desc: t("cat.pecas.desc") },
    { id: "Painel/Botoeira", label: t("cat.painel"), icon: Settings, color: "bg-zinc-600", desc: t("cat.painel.desc") },
    { id: "Resíduos", label: t("cat.residuos"), icon: Trash2, color: "bg-emerald-600", desc: t("cat.residuos.desc") },
  ];

  return (
    <motion.div
      key="step1"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-[min(900px,95vw)] mx-auto flex flex-col my-auto"
    >
      <div className="mb-[clamp(2rem,6vw,3rem)] text-center space-y-2">
        <h2 className="text-[clamp(1.5rem,5vw,2rem)] font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{t("op.step1.title")}</h2>
        <p className="text-[clamp(0.7rem,2vw,0.875rem)] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">{t("op.step1.subtitle")}</p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,280px),1fr))] gap-[clamp(0.75rem,2.5vw,1.25rem)] w-full">
        {PROBLEM_TYPES.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTypeSelect(item.id)}
            className="flex flex-row items-center text-left gap-[clamp(1rem,3vw,1.5rem)] p-[clamp(1rem,3vw,1.5rem)] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-[#DC2626]/30 dark:hover:border-red-500/50 rounded-sm hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all group hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#DC2626] active:scale-[0.98]"
          >
            <div className={`${item.color} w-[clamp(3.5rem,10vw,4.5rem)] h-[clamp(3.5rem,10vw,4.5rem)] shrink-0 rounded-[clamp(0.75rem,3vw,1rem)] flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105`}>
              <item.icon className="w-[clamp(1.75rem,5vw,2.25rem)] h-[clamp(1.75rem,5vw,2.25rem)]" />
            </div>
            <div className="flex-1 flex flex-col">
              <span className="text-[clamp(1rem,3vw,1.25rem)] font-bold text-zinc-900 dark:text-zinc-100 block leading-tight mb-1">{item.label}</span>
              <span className="text-[clamp(0.6rem,1.5vw,0.75rem)] text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider leading-snug">{item.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
};
