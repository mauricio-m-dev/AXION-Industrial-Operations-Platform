import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, User, Layers } from "lucide-react";
import { motion } from "motion/react";
import { useLanguage } from "../contexts/LanguageContext";
import { LanguageSelector } from "../components/LanguageSelector";
import { ThemeToggle } from "../components/ThemeToggle";
import { TermsModal } from "../components/TermsModal";

export default function LoginPage() {
  const [matricula, setMatricula] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const navigate = useNavigate();
  const { t } = useLanguage();
  const adminPath = (import.meta as any).env.VITE_ADMIN_PATH || "admin";

  useEffect(() => {
    const token = localStorage.getItem("admin-token");
    const role = localStorage.getItem("admin-role");
    if (token) {
      if (role === "SuperAdmin" || role === "Admin" || role === "Moderador") {
        navigate(`/${adminPath}`);
      } else {
        navigate("/chamado");
      }
    }
  }, [navigate, adminPath]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matricula.trim() || !password.trim()) {
      toast.error(t("error.send"));
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({ matricula, password })
      });
      const data = await response.json();

      if (response.ok && data.success) {
        if (data.user?.role === "Usuário") {
          sessionStorage.setItem("operator-token", data.token);
          sessionStorage.setItem("operator-data", JSON.stringify({ name: data.user.username, matricula: data.user.matricula }));
          toast.success(t("login.redirect"));
          navigate("/chamado");
        } else {
          localStorage.setItem("admin-token", data.token);
          localStorage.setItem("admin-role", data.user.role);
          localStorage.setItem("admin-username", data.user.username);
          localStorage.setItem("admin-matricula", data.user.matricula);
          toast.success("Acesso autorizado");
          navigate(`/${adminPath}`);
        }
      } else {
        toast.error(data.error || t("error.send"));
      }
    } catch (error) {
      toast.error(t("error.send"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 bg-zinc-50 relative dark:bg-[#000000]">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <ThemeToggle />
        <LanguageSelector />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-[min(400px,95vw)]"
      >
        <Card className="rounded-sm shadow-md shadow-zinc-200/40 dark:shadow-none border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-900 transition-colors duration-300">
          <CardHeader className="pt-6 pb-2 text-center">
            <div className="mb-3 flex justify-center items-center gap-2">
              <span className="h-6 w-1.5 bg-[#DC2626] inline-block animate-pulse"></span>
              <span className="text-2xl font-black tracking-widest text-[#DC2626] dark:text-red-500">
                AXION
              </span>
            </div>
            <CardTitle className="text-lg font-bold text-zinc-800 dark:text-zinc-100 tracking-tight">{t("login.admin")}</CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400 font-medium uppercase tracking-widest text-xs mt-1">
              {t("header.support")}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 pt-2 overflow-hidden relative">
            <form
              onSubmit={handleLogin}
              className="space-y-[clamp(1rem,3vw,1.5rem)]"
            >
              <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
                <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-500 tracking-widest">{t("login.matricula")}</Label>
                <div className="relative group">
                  <User className="absolute left-[1rem] top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-[#DC2626] transition-colors" size={16} />
                  <Input
                    value={matricula}
                    maxLength={7}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      if (val.length <= 7) {
                        setMatricula(val);
                      }
                    }}
                    placeholder={t("modal.matricula")}
                    className="h-[clamp(3rem,8vw,3.5rem)] pl-10 border-zinc-200 dark:border-zinc-800 focus:border-[#DC2626] focus:ring-[#DC2626]/20 transition-all text-[clamp(0.875rem,2vw,1rem)] font-medium rounded-sm bg-zinc-50 dark:bg-zinc-950 focus:bg-white dark:focus:bg-zinc-900 dark:text-zinc-100 w-full"
                  />
                </div>
              </div>

              <div className="space-y-[clamp(0.5rem,1vw,1rem)]">
                <div className="flex items-center justify-between">
                  <Label className="text-[clamp(0.6rem,1.5vw,0.65rem)] font-bold uppercase text-zinc-500 tracking-widest">{t("login.password")}</Label>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-[1rem] top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500 group-focus-within:text-[#DC2626] transition-colors" size={16} />
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    className="h-[clamp(3rem,8vw,3.5rem)] pl-10 border-zinc-200 dark:border-zinc-800 focus:border-[#DC2626] focus:ring-[#DC2626]/20 transition-all text-[clamp(0.875rem,2vw,1rem)] font-medium rounded-sm bg-zinc-50 dark:bg-zinc-950 focus:bg-white dark:focus:bg-zinc-900 dark:text-zinc-100 w-full"
                  />
                </div>
              </div>

              {/* DESATIVADO: Checkbox de termos
              <div className="flex items-center gap-2 mt-4 mb-2 w-full justify-center">
                <div className="relative flex items-center justify-center shrink-0">
                  <input
                    type="checkbox"
                    id="terms-admin"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="peer w-4 h-4 rounded border border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-950 text-[#DC2626] focus:ring-1 focus:ring-[#DC2626]/30 transition-all cursor-pointer appearance-none checked:bg-[#DC2626] checked:border-[#DC2626]"
                    aria-label={t("login.terms.agree")}
                  />
                  <svg className="absolute w-2.5 h-2.5 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <Label htmlFor="terms-admin" className="text-[clamp(0.7rem,1.5vw,0.8rem)] text-zinc-500 dark:text-zinc-400 font-medium cursor-pointer select-none">
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

              <div className="pt-2">
                <Button
                  type="submit"
                  className="w-full h-[clamp(3rem,8vw,3.5rem)] bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-sm font-bold text-[clamp(0.75rem,2vw,0.875rem)] transition-all shadow-md active:scale-[0.98]"
                  disabled={loading || matricula.length !== 7 /* || !termsAccepted */}
                >
                  {loading ? <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : t("login.enter")}
                </Button>
              </div>
            </form>

            <div className="mt-[clamp(1.5rem,4vw,2rem)] pt-[clamp(1rem,3vw,1.5rem)] border-t border-zinc-100 dark:border-zinc-800 flex justify-center transition-colors">
              <span className="text-[clamp(0.5rem,1.5vw,0.6rem)] font-bold text-zinc-300 dark:text-zinc-700 uppercase tracking-[0.4em]">{t("footer.brand")}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
    </div>
  );
}
