import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Package, 
  Zap, 
  AlertTriangle, 
  Trash2, 
  Camera, 
  CheckCircle2, 
  LocateFixed,
  ChevronRight,
  Settings,
  ArrowLeft,
  Layers,
  MessageSquare
} from "lucide-react";
import { ThemeToggle } from "../components/ThemeToggle";
import { motion, AnimatePresence } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { TermsModal } from "../components/TermsModal";

const LOCATIONS = ["FS-22L", "FS-23R", "WS-01", "WS-02", "QC-LINE", "LOG-AREA", "ASSEMBLY-01", "BODY-SHOP"];

export default function OperatorPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const { t } = useLanguage();
  
  const PROBLEM_TYPES = [
    { id: "AGV com falha", label: t("cat.agv"), icon: Zap, color: "bg-red-600", desc: t("cat.agv.desc") },
    { id: "Colisão", label: t("cat.colisao"), icon: AlertTriangle, color: "bg-black", desc: t("cat.colisao.desc") },
    { id: "Falta de peças", label: t("cat.pecas"), icon: Package, color: "bg-red-800", desc: t("cat.pecas.desc") },
    { id: "Painel/Botoeira", label: t("cat.painel"), icon: Settings, color: "bg-zinc-600", desc: t("cat.painel.desc") },
    { id: "Resíduos", label: t("cat.residuos"), icon: Trash2, color: "bg-emerald-600", desc: t("cat.residuos.desc") },
  ];

  const [operatorInfo, setOperatorInfo] = useState({
    name: "",
    matricula: "",
    password: ""
  });

  const [formData, setFormData] = useState({
    type: "",
    location: searchParams.get("linha") || "",
    agv_number: "",
    part_name: "",
    sap_number: "",
    side: "",
    observation: "",
    impact: "",
    downtime: "",
    image: null as File | null,
  });

  useEffect(() => {
    const saved = sessionStorage.getItem("operator-data");
    if (saved) {
      const parsed = JSON.parse(saved);
      setOperatorInfo(parsed);
      setStep(1);
    }
  }, []);

  const handleOperatorLogin = async () => {
    if (!operatorInfo.matricula || !operatorInfo.password) {
      toast.error(t("error.send"));
      return;
    }
    
    setSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ matricula: operatorInfo.matricula, password: operatorInfo.password })
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Obter o nome real do usuário retornado pelo login
        const loggedInfo = {
          name: data.user.username,
          matricula: data.user.matricula
        };
        sessionStorage.setItem("operator-data", JSON.stringify(loggedInfo));
        sessionStorage.setItem("operator-token", data.token);
        setOperatorInfo({...operatorInfo, ...loggedInfo});
        toast.success(t("success.photo") || "Operador identificado!");
        setStep(1);
      } else {
        toast.error(data.error || t("error.send"));
      }
    } catch (error) {
      toast.error(t("error.send"));
    } finally {
      setSubmitting(false);
    }
  };


  const nextStep = () => setStep(prev => prev + 1);
  const prevStep = () => {
    if (step === 1) {
      sessionStorage.removeItem("operator-data");
      sessionStorage.removeItem("operator-token");
    }
    setStep(prev => prev - 1);
  };

  const handleTypeSelect = (type: string) => {
    if (type === "Colisão") {
      setFormData({ 
        ...formData, 
        type,
        impact: "total",
        downtime: "more"
      });
    } else {
      setFormData({ 
        ...formData, 
        type,
        impact: "",
        downtime: ""
      });
    }
    setStep(2);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const imageCompression = (await import('browser-image-compression')).default;
        const options = { maxSizeMB: 1, maxWidthOrHeight: 1280, useWebWorker: false };
        const compressedBlob = await imageCompression(file, options);
        const compressedFile = new File([compressedBlob], file.name, { type: file.type });
        setFormData({ ...formData, image: compressedFile });
        toast.success(t("success.photo") || "Foto otimizada com sucesso!");
      } catch (error) {
        setFormData({ ...formData, image: file });
        toast.success(t("success.photo"));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.location) return toast.error(t("error.loc"));
    if (!formData.observation.trim()) return toast.error(t("error.obs_required"));
    
    setSubmitting(true);
    const data = new FormData();
    
    // Explicitly append fields to avoid type issues with unknown values
    data.append("type", formData.type);
    data.append("location", formData.location);
    data.append("agv_number", formData.agv_number);
    data.append("part_name", formData.part_name);
    data.append("sap_number", formData.sap_number);
    data.append("side", formData.side);
    data.append("observation", formData.observation);
    data.append("operator_name", operatorInfo.name);
    data.append("operator_matricula", operatorInfo.matricula);
    data.append("impact", formData.impact);
    data.append("downtime", formData.downtime);
    if (formData.image) {
      data.append("image", formData.image, formData.image.name || "evidence.jpg");
    }

    try {
      const token = sessionStorage.getItem("operator-token");
      const response = await fetch("/api/tickets", { 
        method: "POST", 
        headers: { 
          "Authorization": `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest"
        },
        body: data 
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setTicketId(result.ticketId);
        setFeedbackText("");
        setFeedbackSent(false);
        setStep(4);
      } else {
        toast.error(result.error || t("error.send"));
      }
    } catch (error) {
      toast.error(t("error.send"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!feedbackText.trim()) return;
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          matricula: operatorInfo.matricula,
          name: operatorInfo.name,
          feedback: feedbackText
        })
      });
      if (response.ok) {
        toast.success(t("toast.feedback_sent"));
        setFeedbackText("");
        setFeedbackSent(true);
      } else {
        toast.error(t("error.send_feedback"));
      }
    } catch (e) {
      toast.error(t("error.send_feedback"));
    }
  };

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-zinc-50 dark:bg-[#000000] overflow-hidden font-sans transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 px-4 sm:px-6 h-16 shrink-0 flex items-center justify-between z-50 transition-colors duration-300 relative">
        <div className="flex items-center gap-4 z-10">
          {step > 0 && step < 4 && (
            <Button variant="ghost" onClick={prevStep} className="font-semibold text-xs text-zinc-500 dark:text-zinc-400 gap-2 h-9 rounded-none px-3 hover:text-[#DC2626] dark:hover:text-red-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all">
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">{t("op.back")}</span>
            </Button>
          )}
          
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="h-5 w-1 bg-[#DC2626] inline-block animate-pulse"></span>
            <span className="text-xl font-black tracking-widest text-[#DC2626] dark:text-red-500">
              AXION
            </span>
            <span className="hidden min-[350px]:inline-flex ml-1 text-[9px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-none border border-zinc-200/50 dark:border-zinc-700/50">
              <span className="hidden sm:inline">{t("app.free_license")}</span>
              <span className="inline sm:hidden">{t("app.free_license_short")}</span>
            </span>
            <div className="hidden sm:block w-[1px] h-3 bg-zinc-200 dark:bg-zinc-700 mx-3" />
            <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">{t("header.support")}</span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 z-10">
          <ThemeToggle />
          <LanguageSelector />
        </div>
      </header>

      {/* Progress Bar */}
      {step < 4 && (
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 shrink-0">
          <motion.div 
            className="h-full bg-[#DC2626] dark:bg-red-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full relative">
        <div className="min-h-full w-full flex flex-col justify-start p-[clamp(1rem,4vw,2rem)] py-[clamp(2rem,6vw,4rem)]">
          <AnimatePresence mode="wait">
          {step === 0 && (
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

                {/* DESATIVADO: Checkbox de termos
                <div className="flex items-center gap-2 mt-4 mb-2 w-full justify-center">
                  <div className="relative flex items-center justify-center shrink-0">
                    <input
                      type="checkbox"
                      id="terms-operator"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="peer w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 text-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/30 transition-all cursor-pointer appearance-none checked:bg-[#DC2626] checked:border-[#DC2626]"
                      aria-label={t("login.terms.agree")}
                    />
                    <svg className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <Label htmlFor="terms-operator" className="text-[clamp(0.7rem,1.5vw,0.8rem)] text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer select-none">
                    {t("login.terms.agree")}{" "}
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowTerms(true);
                      }}
                      className="text-[#DC2626] dark:text-red-400 hover:text-[#B91C1C] dark:hover:text-red-300 hover:underline underline-offset-2 transition-colors font-bold"
                    >
                      {t("login.terms.link")}
                    </button>
                  </Label>
                </div>
                */}

                <Button 
                  onClick={handleOperatorLogin}
                  disabled={operatorInfo.matricula.length !== 7 || !operatorInfo.password || submitting /* || !termsAccepted */}
                  className="h-[clamp(3.5rem,8vw,4rem)] w-full rounded-sm bg-zinc-900 dark:bg-red-600 text-white font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vw,0.75rem)] hover:bg-zinc-800 dark:hover:bg-red-700 transition-all shadow-md mt-[clamp(1rem,4vw,1.5rem)]"
                >
                  {submitting ? t("op.sending") : t("op.continue")}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
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
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full max-w-[min(600px,95vw)] mx-auto flex flex-col my-auto gap-[clamp(1.5rem,4vw,2rem)]"
            >
              <div className="flex items-center gap-[clamp(0.5rem,2vw,1rem)] bg-white dark:bg-zinc-900 p-[clamp(0.75rem,3vw,1.25rem)] rounded-sm border border-zinc-200 dark:border-zinc-800 mb-2 shadow-sm transition-colors">
                 <div className={`${PROBLEM_TYPES.find(p => p.id === formData.type)?.color} w-[clamp(2.5rem,8vw,3rem)] h-[clamp(2.5rem,8vw,3rem)] rounded-[clamp(0.5rem,2vw,0.75rem)] flex items-center justify-center text-white shrink-0`}>
                    {React.createElement(PROBLEM_TYPES.find(p => p.id === formData.type)?.icon || AlertTriangle, { className: "w-[60%] h-[60%]" })}
                 </div>
                 <div className="flex flex-col flex-1 min-w-0">
                   <h2 className="text-[clamp(0.875rem,2.5vw,1rem)] font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-tight truncate">{PROBLEM_TYPES.find(p => p.id === formData.type)?.label}</h2>
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
                      type="number"
                      value={formData.agv_number}
                      onChange={(e) => setFormData({...formData, agv_number: e.target.value})}
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

                {/* Priority Fields */}
                {formData.type === "Colisão" ? (
                  <div className="p-5 rounded-sm border-2 border-red-200 dark:border-red-950/30 bg-red-50/50 dark:bg-red-950/20 text-red-700 dark:text-red-400 flex items-start gap-3 mt-4">
                    <AlertTriangle className="shrink-0 animate-pulse text-red-600 dark:text-red-500 mt-0.5" size={20} />
                    <div className="flex-1">
                      <p className="text-[clamp(0.7rem,1.8vw,0.8rem)] font-extrabold uppercase tracking-wider mb-1">Prioridade Crítica Automática</p>
                      <p className="text-[clamp(0.65rem,1.6vw,0.75rem)] font-medium leading-relaxed">
                        Chamados de colisão são classificados automaticamente como urgência máxima (<b>Crítico</b>). O sistema notificará os gestores via WhatsApp e Email imediatamente.
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
          )}

          {step === 3 && (
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
                  <label className="flex flex-col items-center justify-center h-[clamp(10rem,25vw,14rem)] border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-sm cursor-pointer bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-[#DC2626]/40 dark:hover:border-red-500/50 hover:shadow-md transition-all group">
                    {formData.image ? (
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
                disabled={submitting || !formData.observation.trim()}
                className="h-[clamp(3.5rem,8vw,4rem)] w-full rounded-sm bg-[#DC2626] dark:bg-red-600 text-white font-bold uppercase tracking-widest text-[clamp(0.6rem,1.5vw,0.75rem)] hover:bg-[#B91C1C] dark:hover:bg-red-700 transition-all shadow-md mt-2 disabled:opacity-70"
              >
                {submitting ? t("op.sending") : t("op.finish")}
              </Button>
            </motion.div>
          )}

          {step === 4 && (
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
                onClick={() => {
                  setFormData({ ...formData, type: "", agv_number: "", part_name: "", sap_number: "", side: "", observation: "", impact: "", downtime: "", image: null });
                  setStep(1);
                }}
              >
                {t("op.new_ticket")}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>

      {/* Footer Branding - Fixed */}
      <footer className="h-12 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center shrink-0 transition-colors duration-300">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-zinc-300 dark:text-zinc-700">{t("footer.brand")}</p>
      </footer>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
