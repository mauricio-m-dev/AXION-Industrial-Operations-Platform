import React from "react";
import { motion } from "motion/react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LocateFixed, AlertTriangle, Package, Zap, Settings, Trash2 } from "lucide-react";

const LOCATIONS = ["FS-22L", "FS-23R", "WS-01", "WS-02", "QC-LINE", "LOG-AREA", "ASSEMBLY-01", "BODY-SHOP"];

interface StepDetailsProps {
  t: (key: string) => string;
  formData: any;
  setFormData: (data: any) => void;
  nextStep: () => void;
}

export const StepDetails = ({ t, formData, setFormData, nextStep }: StepDetailsProps) => {
  const getIconAndColor = (type: string) => {
    switch (type) {
      case "AGV com falha": return { icon: Zap, color: "bg-red-600", label: t("cat.agv") };
      case "Colisão": return { icon: AlertTriangle, color: "bg-black", label: t("cat.colisao") };
      case "Falta de peças": return { icon: Package, color: "bg-red-800", label: t("cat.pecas") };
      case "Painel/Botoeira": return { icon: Settings, color: "bg-zinc-600", label: t("cat.painel") };
      case "Resíduos": return { icon: Trash2, color: "bg-emerald-600", label: t("cat.residuos") };
      default: return { icon: AlertTriangle, color: "bg-zinc-500", label: type };
    }
  };

  const { icon: Icon, color, label } = getIconAndColor(formData.type);

  return (
    <motion.div
      key="step2"
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-[min(600px,95vw)] mx-auto flex flex-col my-auto gap-[clamp(1.5rem,4vw,2rem)]"
    >
      <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] bg-white dark:bg-zinc-900 p-[clamp(0.75rem,3vw,1.25rem)] rounded-sm border border-zinc-200 dark:border-zinc-800 mb-2 shadow-sm transition-colors">
         <div className={`${color} w-[clamp(2.5rem,8vw,3rem)] h-[clamp(2.5rem,8vw,3rem)] rounded-[clamp(0.5rem,2vw,0.75rem)] flex items-center justify-center text-white shrink-0`}>
            <Icon className="w-[60%] h-[60%]" />
         </div>
         <div className="flex flex-col flex-1 min-w-0">
           <h2 className="text-[clamp(0.875rem,2.5vw,1rem)] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight truncate">{label}</h2>
           <span className="text-[clamp(0.6rem,1.5vw,0.75rem)] font-semibold text-zinc-500 dark:text-zinc-400 tracking-wider truncate">{t("op.step2.fill")}</span>
         </div>
      </div>

      <div className="space-y-[clamp(1rem,3vw,1.5rem)]">
        <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
          <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.loc")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
          <div className="relative">
            <LocateFixed className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={16} />
            <Input 
              placeholder={t("op.loc.placeholder")}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value.toUpperCase() })}
              className="h-[clamp(3rem,8vw,3.5rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-semibold rounded-sm pl-11 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 focus:border-[#DC2626] dark:focus:border-red-500 focus:ring-2 focus:ring-[#DC2626]/20 shadow-sm transition-all"
              list="locations"
            />
            <datalist id="locations">
              {LOCATIONS.map(l => <option key={l} value={l} />)}
            </datalist>
          </div>
        </div>

        {(formData.type === "AGV com falha" || formData.type === "Colisão") && (
          <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
            <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.agv_num")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
            <Input 
              placeholder={t("op.agv.placeholder")}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={10}
              value={formData.agv_number}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                if (val.length <= 10) setFormData({...formData, agv_number: val});
              }}
              className="h-[clamp(3.5rem,10vw,4rem)] text-[clamp(1.25rem,4vw,1.5rem)] font-bold rounded-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 focus:border-[#DC2626] dark:focus:border-red-500 focus:ring-2 focus:ring-[#DC2626]/20 shadow-sm text-center tracking-[0.2em] transition-all"
            />
          </div>
        )}

        {formData.type === "Falta de peças" && (
          <div className="grid grid-cols-1 gap-[clamp(1rem,3vw,1.5rem)]">
            <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
              <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.part_name")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
              <Input 
                placeholder={t("op.part.placeholder")}
                value={formData.part_name}
                onChange={(e) => setFormData({...formData, part_name: e.target.value})}
                className="h-[clamp(3rem,8vw,3.5rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-semibold rounded-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 focus:border-[#DC2626] dark:focus:border-red-500 focus:ring-2 focus:ring-[#DC2626]/20 shadow-sm transition-all"
              />
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-[clamp(0.75rem,2vw,1.25rem)]">
              <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
                <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.sap")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
                <Input 
                  placeholder={t("op.sap.placeholder")}
                  value={formData.sap_number}
                  onChange={(e) => setFormData({...formData, sap_number: e.target.value})}
                  className="h-[clamp(3rem,8vw,3.5rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-semibold rounded-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 focus:border-[#DC2626] dark:focus:border-red-500 focus:ring-2 focus:ring-[#DC2626]/20 shadow-sm transition-all"
                />
              </div>
              <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
                <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.side")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
                <Input 
                  placeholder={t("op.side.placeholder")}
                  value={formData.side}
                  onChange={(e) => setFormData({...formData, side: e.target.value})}
                  className="h-[clamp(3rem,8vw,3.5rem)] text-[clamp(0.875rem,2.5vw,1rem)] font-semibold rounded-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 dark:text-zinc-100 focus:border-[#DC2626] dark:focus:border-red-500 focus:ring-2 focus:ring-[#DC2626]/20 shadow-sm transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {formData.type === "Colisão" ? (
          <div className="p-5 rounded-sm border-2 border-red-200 dark:border-red-950/30 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 flex items-start gap-3 mt-4">
            <AlertTriangle className="shrink-0 animate-pulse text-red-600 dark:text-red-500 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-[clamp(0.7rem,1.8vw,0.8rem)] font-extrabold uppercase tracking-wider mb-1">Prioridade Crítica Automática</p>
              <p className="text-[clamp(0.65rem,1.6vw,0.75rem)] font-medium leading-relaxed">
                Chamados de colisão são classificados automaticamente como urgência máxima (<b>Crítico</b>). O sistema notificará os gestores via WeCom e Email imediatamente.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-[clamp(1rem,3vw,1.5rem)] pt-[clamp(0.5rem,1.5vw,1rem)] border-t border-zinc-100 dark:border-zinc-800">
            <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
              <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.impact")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                {[
                  { id: "total", label: t("op.impact.total"), color: "border-red-200 dark:border-red-900/30 hover:border-red-500 dark:hover:border-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 peer-checked:border-red-500 dark:peer-checked:border-red-500 peer-checked:bg-red-50 dark:peer-checked:bg-red-900/20" },
                  { id: "partial", label: t("op.impact.partial"), color: "border-orange-200 dark:border-orange-900/30 hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/10 peer-checked:border-orange-500 dark:peer-checked:border-orange-500 peer-checked:bg-orange-50 dark:peer-checked:bg-orange-900/20" },
                  { id: "none", label: t("op.impact.none"), color: "border-green-200 dark:border-green-900/30 hover:border-green-500 dark:hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/10 peer-checked:border-green-500 dark:peer-checked:border-green-500 peer-checked:bg-green-50 dark:peer-checked:bg-green-900/20" },
                ].map(opt => (
                  <label key={opt.id} className="cursor-pointer h-full">
                    <input 
                      type="radio" 
                      name="impact" 
                      value={opt.id}
                      checked={formData.impact === opt.id}
                      onChange={(e) => setFormData({...formData, impact: e.target.value})}
                      className="peer sr-only"
                    />
                    <div className={`h-[clamp(3rem,8vw,3.5rem)] flex items-center justify-center px-2 text-center rounded-sm border-2 bg-white dark:bg-zinc-900 transition-all ${opt.color} ${formData.impact === opt.id ? 'shadow-sm font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 font-semibold'}`}>
                      <span className="text-[clamp(0.65rem,1.5vw,0.75rem)] leading-tight">{opt.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
              <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-widest pl-1">{t("op.downtime")} <span className="text-[#DC2626] dark:text-red-400">*</span></Label>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-[clamp(0.5rem,1.5vw,0.75rem)]">
                {[
                  { id: "now", label: t("op.downtime.now") },
                  { id: "15m", label: t("op.downtime.15m") },
                  { id: "more", label: t("op.downtime.more") },
                ].map(opt => (
                  <label key={opt.id} className="cursor-pointer h-full">
                    <input 
                      type="radio" 
                      name="downtime" 
                      value={opt.id}
                      checked={formData.downtime === opt.id}
                      onChange={(e) => setFormData({...formData, downtime: e.target.value})}
                      className="peer sr-only"
                    />
                    <div className={`h-[clamp(3rem,8vw,3.5rem)] flex items-center justify-center px-2 text-center rounded-sm border-2 bg-white dark:bg-zinc-900 transition-all border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 peer-checked:border-zinc-800 dark:peer-checked:border-red-500 peer-checked:bg-zinc-50 dark:peer-checked:bg-red-900/10 ${formData.downtime === opt.id ? 'shadow-sm font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-500 dark:text-zinc-400 font-semibold'}`}>
                      <span className="text-[clamp(0.65rem,1.5vw,0.75rem)] leading-tight">{opt.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <Button 
        onClick={nextStep}
        disabled={
          !formData.location || 
          !formData.impact ||
          !formData.downtime ||
          ((formData.type === "AGV com falha" || formData.type === "Colisão") && !formData.agv_number) ||
          (formData.type === "Falta de peças" && (!formData.part_name || !formData.sap_number || !formData.side))
        }
        className="h-[clamp(3.5rem,8vw,4rem)] w-full rounded-sm bg-zinc-900 dark:bg-red-600 text-white font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vw,0.75rem)] hover:bg-zinc-800 dark:hover:bg-red-700 transition-all shadow-md mt-[clamp(1rem,4vw,1.5rem)]"
      >
        {t("op.next")}
      </Button>
    </motion.div>
  );
};
