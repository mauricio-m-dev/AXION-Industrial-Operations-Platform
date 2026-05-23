import React, { useState } from "react";
import { useLanguage } from "../contexts/LanguageContext";
import { ShieldCheck, Copy, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { sanitizeImageSrc } from "../utils/sanitize";
import DOMPurify from "dompurify";

export function SecurityTab() {
  const { t, language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; qrCodeUrl: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);

  const handleStartSetup = async () => {
    const token = localStorage.getItem("admin-token");
    if (!token) {
      toast.error("Sessão expirada. Por favor, faça login novamente.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/mfa/setup", {
        method: "POST",
        headers: {
          "X-Requested-With": "XMLHttpRequest",
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSetupData(data);
      } else {
        toast.error(data.error || "Erro ao configurar MFA");
      }
    } catch (e) {
      toast.error("Erro na comunicação");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (mfaCode.length < 6) return;
    const token = localStorage.getItem("admin-token");
    if (!token) {
      toast.error("Sessão expirada. Por favor, faça login novamente.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/mfa/enable", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ token: mfaCode })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMfaEnabled(true);
        toast.success("MFA ativado com sucesso!");
      } else {
        toast.error(data.error || "Código inválido");
      }
    } catch (e) {
      toast.error("Erro na comunicação");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      toast.success("Código secreto copiado!");
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-sm shadow-sm border border-zinc-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300">
      <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between transition-colors duration-300">
        <div>
          <h3 className="text-lg font-bold text-zinc-800 dark:text-zinc-100">{t("sec.title") || "Segurança da Conta"}</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-1">
            {t("sec.subtitle") || "Gerencie as configurações de autenticação de dois fatores (MFA)."}
          </p>
        </div>
      </div>

      <div className="p-6 max-w-3xl">
        {mfaEnabled ? (
          <div className="flex flex-col items-center justify-center p-8 bg-green-50 dark:bg-green-900/20 rounded-sm border border-green-100 dark:border-green-900/50 transition-colors">
            <CheckCircle2 size={48} className="text-green-500 mb-4" />
            <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">MFA Ativado</h4>
            <p className="text-zinc-600 dark:text-zinc-300 text-center font-medium max-w-sm">
              Sua conta está mais segura. Você precisará do aplicativo autenticador sempre que fizer login no painel administrativo.
            </p>
          </div>
        ) : !setupData ? (
          <div className="flex flex-col gap-6">
            <div className="flex gap-4 items-start p-4 bg-zinc-50 dark:bg-zinc-900/50 rounded-sm border border-zinc-200 dark:border-zinc-800 transition-colors duration-300">
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-sm shadow-sm border border-zinc-100 dark:border-zinc-800">
                <ShieldCheck className="text-[#DC2626] dark:text-red-400" size={24} />
              </div>
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">Proteja o Painel Administrativo</h4>
                <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                  A Autenticação de Dois Fatores (MFA) adiciona uma camada extra de segurança.
                  Ao fazer login, você deverá inserir a sua senha e um código numérico de 6 dígitos gerado por um aplicativo no seu celular (como Google Authenticator ou Authy).
                </p>
              </div>
            </div>
            
            <Button 
              onClick={handleStartSetup} 
              disabled={loading}
              className="w-fit bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-bold px-6 h-11"
            >
              {loading ? "Processando..." : "Configurar MFA agora"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-10">
            <div className="flex-1 space-y-8">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-red-100 dark:bg-red-900/30 text-[#DC2626] dark:text-red-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors">1</div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Escaneie o QR Code</h4>
                </div>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium ml-8">
                  Abra o Google Authenticator ou Authy e escaneie o código da imagem.
                </p>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-red-100 dark:bg-red-900/30 text-[#DC2626] dark:text-red-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors">2</div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Ou insira a chave manualmente</h4>
                </div>
                <div className="flex items-center gap-2 ml-8">
                  <code className="bg-zinc-100 dark:bg-zinc-800 px-3 py-2 rounded-sm text-xs font-bold text-zinc-800 dark:text-zinc-100 tracking-wider">
                    {setupData.secret}
                  </code>
                  <Button variant="outline" size="icon" onClick={copySecret} className="h-8 w-8 ml-2 dark:border-zinc-700">
                    <Copy size={14} className="text-zinc-500 dark:text-zinc-400" />
                  </Button>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-red-100 dark:bg-red-900/30 text-[#DC2626] dark:text-red-400 w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs transition-colors">3</div>
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">Confirme o código gerado</h4>
                </div>
                <div className="ml-8 flex flex-col gap-3">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/[^0-9]/g, ''))}
                    className="max-w-[200px] text-center tracking-[0.5em] font-bold text-xl h-12 border-zinc-300 dark:border-zinc-700 focus:border-[#DC2626] bg-zinc-50 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                  <Button 
                    onClick={handleVerify} 
                    disabled={mfaCode.length < 6 || loading}
                    className="max-w-[200px] bg-[#DC2626] hover:bg-[#B91C1C] h-11"
                  >
                    {loading ? "Verificando..." : "Ativar Autenticação"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-sm shadow-sm self-start transition-colors duration-300">
              {/* deepcode ignore DOMXSS: URL validated by sanitizeImageSrc strict allowlist */}
              <img src={DOMPurify.sanitize(sanitizeImageSrc(setupData.qrCodeUrl))} alt="QR Code MFA" className="w-48 h-48 border border-zinc-100 dark:border-zinc-800 rounded-sm p-2 bg-white dark:bg-zinc-950" />
              <p className="text-[10px] font-bold text-zinc-400 mt-4 uppercase tracking-[0.2em]">AXION Enterprise Ops</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
