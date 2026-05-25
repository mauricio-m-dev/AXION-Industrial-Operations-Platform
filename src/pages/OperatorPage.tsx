import React, { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "../components/ThemeToggle";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { TermsModal } from "../components/TermsModal";
import { useOperatorForm } from "../hooks/operator/useOperatorForm";

import { StepIdentification } from "../components/operator/StepIdentification";
import { StepType } from "../components/operator/StepType";
import { StepDetails } from "../components/operator/StepDetails";
import { StepEvidence } from "../components/operator/StepEvidence";
import { StepSuccess } from "../components/operator/StepSuccess";

export default function OperatorPage() {
  const { t } = useLanguage();
  const [showTerms, setShowTerms] = useState(false);

  const {
    step,
    submitting,
    ticketId,
    feedbackText,
    setFeedbackText,
    feedbackSent,
    imagePreview,
    operatorInfo,
    setOperatorInfo,
    formData,
    setFormData,
    handleOperatorLogin,
    nextStep,
    prevStep,
    handleTypeSelect,
    handleFileChange,
    handleSubmit,
    handleSendFeedback,
    resetForm
  } = useOperatorForm(t);

  return (
    <div className="h-[100dvh] w-screen flex flex-col bg-zinc-50 dark:bg-[#000000] overflow-hidden font-sans transition-colors duration-300">
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

      {step < 4 && (
        <div className="h-1.5 w-full bg-zinc-100 dark:bg-zinc-800 shrink-0">
          <motion.div 
            className="h-full bg-[#DC2626] dark:bg-red-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]"
            initial={{ width: "0%" }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
      )}

      <main className="flex-1 overflow-y-auto overflow-x-hidden w-full relative">
        <div className="min-h-full w-full flex flex-col justify-start p-[clamp(1rem,4vw,2rem)] py-[clamp(2rem,6vw,4rem)]">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <StepIdentification 
                t={t} 
                operatorInfo={operatorInfo} 
                setOperatorInfo={setOperatorInfo} 
                submitting={submitting} 
                handleOperatorLogin={handleOperatorLogin} 
              />
            )}
            {step === 1 && (
              <StepType 
                t={t} 
                handleTypeSelect={handleTypeSelect} 
              />
            )}
            {step === 2 && (
              <StepDetails 
                t={t} 
                formData={formData} 
                setFormData={setFormData} 
                nextStep={nextStep} 
              />
            )}
            {step === 3 && (
              <StepEvidence 
                t={t} 
                formData={formData} 
                setFormData={setFormData} 
                imagePreview={imagePreview} 
                handleFileChange={handleFileChange} 
                handleSubmit={handleSubmit} 
                submitting={submitting} 
              />
            )}
            {step === 4 && (
              <StepSuccess 
                t={t} 
                ticketId={ticketId} 
                feedbackSent={feedbackSent} 
                feedbackText={feedbackText} 
                setFeedbackText={setFeedbackText} 
                handleSendFeedback={handleSendFeedback} 
                resetForm={resetForm} 
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="h-12 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center shrink-0 transition-colors duration-300">
        <p className="text-[8px] font-black uppercase tracking-[0.5em] text-zinc-300 dark:text-zinc-700">{t("footer.brand")}</p>
      </footer>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
