import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Database, Server, Cpu, HardDrive, RefreshCw, Zap, Trash2, Power, ShieldAlert, Send, Radio, Terminal, Users, Clock, CheckCircle, AlertTriangle, FileText, ShieldX, Check } from "lucide-react";
import { toast } from "sonner";
import { triggerSafeDownload } from "../utils/sanitize";

interface HealthData {
  status: string;
  uptime: number;
  timestamp: string;
  services: {
    mongodb: string;
    redis: string;
  };
  system: {
    memory_total_mb: number;
    memory_free_mb: number;
    memory_app_used_mb: number;
    cpu_load: number[];
  };
  apm?: {
    requestsPerMin: number;
    errorRatePercent: string;
    avgLatencyMs: number;
    wsClients: number;
    workerPid: number;
    workerId: number;
    recentLogs: { timestamp: string; level: string; message: string }[];
  };
  maintenance?: boolean;
}

export function HealthDashboard() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [targetInput, setTargetInput] = useState("");
  const [testType, setTestType] = useState<"whatsapp" | "email">("email");
  const [wipeModalOpen, setWipeModalOpen] = useState(false);
  const [wipePassword, setWipePassword] = useState("");
  const [reportRange, setReportRange] = useState<"24h" | "7d" | "30d">("24h");
  const [isGenerating, setIsGenerating] = useState(false);
  const [blacklistedIps, setBlacklistedIps] = useState<string[]>([]);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const [healthRes, blacklistRes] = await Promise.all([
        fetch("/api/health"),
        fetch("/api/apm/blacklist")
      ]);
      const data = await healthRes.json();
      setHealth(data);
      if (blacklistRes.ok) {
        const blData = await blacklistRes.json();
        setBlacklistedIps(Array.isArray(blData) ? blData : []);
      }
      setLastUpdated(new Date());
    } catch (error) {
      toast.error("Erro ao obter dados de saúde do sistema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000); // Atualiza a cada 15s
    return () => clearInterval(interval);
  }, []);

  const getHeaders = () => ({
    
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest"
  });

  const handleAction = async (endpoint: string, body?: any) => {
    setActing(true);
    try {
      const res = await fetch(`/api/apm/${endpoint}`, {
        method: "POST",
        headers: getHeaders(),
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Ação de infraestrutura concluída.");
        fetchHealth();
      } else {
        toast.error(data.error || "Ação não autorizada ou indisponível.");
      }
    } catch (err: any) {
      toast.error("Erro de comunicação ao disparar comando APM.");
    } finally {
      setActing(false);
    }
  };

  const handlePardonIp = async (ip: string) => {
    setActing(true);
    try {
      const res = await fetch(`/api/blacklist/${ip}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || `IP ${ip} perdoado com sucesso.`);
        fetchHealth();
      } else {
        toast.error(data.error || "Ação não autorizada.");
      }
    } catch (err) {
      toast.error("Erro de comunicação ao perdoar IP.");
    } finally {
      setActing(false);
    }
  };

  const handleWipeDb = async () => {
    if (!wipePassword) {
      toast.error("A senha é obrigatória para limpar o banco.");
      return;
    }
    setActing(true);
    try {
      const res = await fetch(`/api/apm/clear-db`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ password: wipePassword })
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Banco de dados limpo com sucesso!");
        setWipeModalOpen(false);
        setWipePassword("");
        fetchHealth();
      } else {
        toast.error(data.error || "Ação não autorizada.");
      }
    } catch (err: any) {
      toast.error("Erro de comunicação ao disparar o wipe.");
    } finally {
      setActing(false);
    }
  };

  const generateHealthReport = async () => {
    // Refactored to use the professional LaTeX engine via backend
    toast.loading("Analisando infraestrutura e compilando PDF LaTeX...", { id: "health-gen" });
    try {
      const res = await fetch(`/api/apm/reports/generate-pdf`, {
        method: "POST",
        headers: {
          'Content-Type': 'application/json',
          
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ type: 'health', range: reportRange })
      });
      
      if (!res.ok) throw new Error("Erro na geração do PDF.");
      
      const blob = await res.blob();
      // deepcode ignore DOMXSS: blob URL from URL.createObjectURL is browser-controlled and cannot execute JS
      triggerSafeDownload(blob, `auditoria_axion_${new Date().toISOString().split('T')[0]}.pdf`);
      
      toast.success("Auditoria (PDF) gerada com padrão executivo.", { id: "health-gen" });
    } catch (err) {
      toast.error("Erro no motor LaTeX. Usando visualização local...", { id: "health-gen" });
      const element = document.getElementById('health-report-pdf-template');
      if (element) {
        element.style.display = 'block';
        window.print();
        element.style.display = 'none';
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (!health) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground font-medium animate-pulse">Iniciando telemetria avançada de APM...</p>
      </div>
    );
  }

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor(seconds % (3600 * 24) / 3600);
    const m = Math.floor(seconds % 3600 / 60);
    return `${d}d ${h}h ${m}m`;
  };

  const memPercent = Math.round((health.system.memory_app_used_mb / health.system.memory_total_mb) * 100) || 0;
  const apm = health.apm;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-6 rounded-sm border border-zinc-100 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Painel Geral de APM & Saúde</h2>
            {health.maintenance && (
              <Badge variant="destructive" className="animate-pulse bg-red-600 font-bold px-2.5 py-0.5">
                MODO DE MANUTENÇÃO ATIVO
              </Badge>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Monitoramento de ponta a ponta e controle de mitigação de processos em tempo real.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-800/50 px-3 py-1.5 rounded-sm">
            Atualizado: {lastUpdated.toLocaleTimeString()}
          </div>
          <button 
            onClick={fetchHealth} 
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-md shadow-blue-500/20 disabled:opacity-50`}
            title="Sincronizar telemetria"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {loading ? "Sincronizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      {/* Ações Rápidas de Mitigação (Ações de SuperAdmin) */}
      <Card className="border-none bg-gradient-to-br from-zinc-900 via-indigo-950 to-zinc-900 text-white shadow-md rounded-sm overflow-hidden relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <CardHeader className="pb-3 border-b border-white/10">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-zinc-100">
            <Radio className="text-red-400 animate-pulse" size={18} />
            Ações de Mitigação em Tempo Real (Superadmin)
          </CardTitle>
          <p className="text-xs text-zinc-400">Atue diretamente sobre os gargalos da infraestrutura sem necessitar de acesso por terminal ou alteração de arquivos.</p>
        </CardHeader>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => handleAction("flush-redis")}
            disabled={acting}
            className="flex flex-col items-start justify-between p-4 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left group disabled:opacity-50 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <Zap className="text-amber-400" size={20} />
              <span className="text-[10px] font-mono text-zinc-400 group-hover:text-amber-400 transition-colors">flushDb()</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-zinc-200">Limpar Cache do Redis</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">Força o descarte de chaves em memória e ressincroniza queries.</span>
            </div>
          </button>

          <button
            onClick={() => handleAction("reload-workers")}
            disabled={acting}
            className="flex flex-col items-start justify-between p-4 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left group disabled:opacity-50 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <Power className="text-red-400" size={20} />
              <span className="text-[10px] font-mono text-zinc-400 group-hover:text-red-400 transition-colors">cluster.fork</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-zinc-200">Reciclar Workers</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">Reinicializa os processos do Node.js de forma limpa e sequencial.</span>
            </div>
          </button>

          <button
            onClick={() => handleAction("gc")}
            disabled={acting}
            className="flex flex-col items-start justify-between p-4 rounded-sm bg-white/5 hover:bg-white/10 border border-white/10 transition-all text-left group disabled:opacity-50 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <Trash2 className="text-emerald-400" size={20} />
              <span className="text-[10px] font-mono text-zinc-400 group-hover:text-emerald-400 transition-colors">global.gc()</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-zinc-200">Forçar Coleta de Lixo</span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">Desaloca imediatamente resíduos e fragmentos da memória Heap.</span>
            </div>
          </button>

          <button
            onClick={() => handleAction("maintenance", { enabled: !health.maintenance })}
            disabled={acting}
            className={`flex flex-col items-start justify-between p-4 rounded-sm border transition-all text-left group disabled:opacity-50 hover:scale-[1.02] ${
              health.maintenance 
                ? "bg-red-500/20 hover:bg-red-500/30 border-red-500/40 text-red-200" 
                : "bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200"
            }`}
          >
            <div className="flex items-center justify-between w-full mb-2">
              <ShieldAlert className={health.maintenance ? "text-red-400" : "text-indigo-400"} size={20} />
              <span className="text-[10px] font-mono text-zinc-400">503 Status</span>
            </div>
            <div>
              <span className="block text-xs font-bold">
                {health.maintenance ? "Desativar Manutenção" : "Ativar Modo Manutenção"}
              </span>
              <span className="text-[11px] text-zinc-400 block mt-0.5">
                {health.maintenance ? "Restabelece criação global de chamados." : "Bloqueia novos envios para intervenção segura."}
              </span>
            </div>
          </button>

          <button
            onClick={() => setWipeModalOpen(true)}
            disabled={acting}
            className="flex flex-col items-start justify-between p-4 rounded-sm bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all text-left group disabled:opacity-50 hover:scale-[1.02]"
          >
            <div className="flex items-center justify-between w-full mb-2">
              <Trash2 className="text-red-500" size={20} />
              <span className="text-[10px] font-mono text-red-400">drop()</span>
            </div>
            <div>
              <span className="block text-xs font-bold text-red-200">Limpar Banco de Dados</span>
              <span className="text-[11px] text-red-400/80 block mt-0.5">Apaga todos os dados e reseta para a fábrica.</span>
            </div>
          </button>

          {/* Módulo Integrado de Testes de Notificação */}
          <div className="md:col-span-2 lg:col-span-4 pt-3 mt-1 border-t border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
              <Send size={14} className="text-red-400" /> Disparar Teste Instantâneo de Notificação:
            </span>
            <div className="flex flex-1 max-w-lg gap-2 items-center">
              <select
                value={testType}
                onChange={(e: any) => setTestType(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-sm text-xs px-2.5 py-2 text-zinc-200 outline-none focus:border-red-400 h-9"
              >
                <option value="email" className="bg-zinc-900">E-mail SMTP</option>
                <option value="whatsapp" className="bg-zinc-900">WhatsApp API</option>
              </select>
              <input
                type="text"
                placeholder={testType === "email" ? "destinatario@email.com" : "5511999999999"}
                value={targetInput}
                onChange={(e) => setTargetInput(e.target.value)}
                className="bg-white/10 border border-white/10 rounded-sm text-xs px-3 py-2 text-zinc-200 outline-none focus:border-red-400 flex-1 h-9 placeholder:text-zinc-500"
              />
              <button
                onClick={() => {
                  if (!targetInput) return toast.error("Informe um destinatário para o teste.");
                  handleAction("test-notifications", { type: testType, target: targetInput });
                }}
                disabled={acting || !targetInput}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 rounded-sm transition-colors h-9 shrink-0 flex items-center gap-1"
              >
                Enviar
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Blacklist de IP (Anti-Brute Force) */}
      <Card className="border-none bg-zinc-900 text-white shadow-md rounded-sm overflow-hidden">
        <CardHeader className="pb-3 border-b border-white/10 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2 text-red-400">
              <ShieldX size={18} />
              Defesa de Perímetro (IP Blacklist)
            </CardTitle>
            <p className="text-xs text-zinc-400 mt-1">IPs bloqueados automaticamente pelo Anti-Brute Force (4+ falhas).</p>
          </div>
          <Badge variant="destructive" className="bg-red-500/20 text-red-400 border border-red-500/30">
            {blacklistedIps.length} BLOQUEADO(S)
          </Badge>
        </CardHeader>
        <CardContent className="pt-4">
          {blacklistedIps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-zinc-500">
              <CheckCircle size={32} className="text-emerald-500/50 mb-2" />
              <p className="text-xs font-semibold">Nenhum IP na blacklist no momento.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {blacklistedIps.map(ip => (
                <div key={ip} className="flex items-center justify-between bg-white/5 border border-white/10 p-3 rounded-sm">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-wider">Endereço IP</span>
                    <span className="text-sm font-mono font-bold text-zinc-200">{ip}</span>
                  </div>
                  <button
                    onClick={() => handlePardonIp(ip)}
                    disabled={acting}
                    className="p-2 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 rounded-sm transition-colors disabled:opacity-50"
                    title="Perdoar (Whitelist)"
                  >
                    <Check size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grid de Tráfego e API */}
      {apm && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tráfego de API</CardTitle>
              <Activity className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{apm.requestsPerMin}</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Requisições no minuto atual</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Taxa de Erros</CardTitle>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{apm.errorRatePercent}%</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Códigos de status 4xx / 5xx</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Latência Média</CardTitle>
              <Clock className="h-4 w-4 text-indigo-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{apm.avgLatencyMs} ms</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Tempo médio de resposta</p>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Conexões Sockets</CardTitle>
              <Users className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{apm.wsClients}</div>
              <p className="text-[11px] text-zinc-400 mt-0.5">Operadores ao vivo via WebSocket</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grid de Serviços Existentes */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status Global</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold uppercase mb-1 dark:text-zinc-100">
              {health.status === "ok" ? (
                <span className="text-emerald-600 dark:text-emerald-400">Operacional</span>
              ) : (
                <span className="text-amber-500 dark:text-amber-400">Instável</span>
              )}
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              Uptime: {formatUptime(health.uptime)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">MongoDB</CardTitle>
            <Database className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              {health.services.mongodb === "connected" ? (
                <Badge className="bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40 font-bold">Conectado</Badge>
              ) : (
                <Badge variant="destructive">Desconectado</Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400">Replica Set / Pool de conexões</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Redis Cache</CardTitle>
            <Server className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="mb-2">
              {health.services.redis === "connected" ? (
                <Badge className="bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-900/40 font-bold">Conectado</Badge>
              ) : (
                <Badge variant="destructive">Desconectado</Badge>
              )}
            </div>
            <p className="text-xs text-zinc-400">In-Memory Store / Sessões</p>
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Carga de CPU (1m)</CardTitle>
            <Cpu className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold dark:text-zinc-100 mb-1">
              {health.system.cpu_load[0].toFixed(2)}
            </div>
            <p className="text-xs text-zinc-400">
              Médias: {health.system.cpu_load.map(v => v.toFixed(2)).join(" / ")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Consumo de Memória e Cluster */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800">
        <CardHeader>
          <CardTitle className="text-base font-bold flex items-center justify-between text-zinc-900 dark:text-zinc-100">
            <span className="flex items-center gap-2">
              <HardDrive className="h-4 w-4 text-red-500" />
              Consumo de Memória e Instância Node.js
            </span>
            {apm && (
              <span className="text-xs font-mono text-zinc-400 font-normal">
                Worker PID: <strong className="text-zinc-700 dark:text-zinc-300">{apm.workerPid}</strong>
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-zinc-600 dark:text-zinc-400">Alocação do Processo (RSS)</span>
              <span className="font-mono text-zinc-900 dark:text-zinc-200 font-bold">{health.system.memory_app_used_mb} MB / {health.system.memory_total_mb} MB</span>
            </div>
            <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${memPercent > 85 ? "bg-red-500" : memPercent > 70 ? "bg-amber-500" : "bg-red-600"}`} 
                style={{ width: `${Math.min(100, memPercent)}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-3 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-xs text-zinc-400">Memória Livre (SO)</p>
              <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">{health.system.memory_free_mb} MB</p>
            </div>
            <div>
              <p className="text-xs text-zinc-400">Capacidade Total</p>
              <p className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100 mt-0.5">{health.system.memory_total_mb} MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Módulo de Relatórios e Inteligência */}
      <Card className="bg-white dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800 shadow-md rounded-sm overflow-hidden border-l-4 border-l-blue-600">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-lg font-black flex items-center gap-2 text-zinc-900 dark:text-zinc-100">
                <FileText className="text-red-600" size={20} />
                Relatórios de Saúde & Inteligência (PDF)
              </CardTitle>
              <p className="text-xs text-zinc-500 mt-1">Gere documentos profissionais com diagnósticos automáticos e análise de riscos infraestruturais.</p>
            </div>
            <div className="flex items-center gap-2 bg-zinc-50 dark:bg-zinc-950 p-1 rounded-sm border border-zinc-100 dark:border-zinc-800">
              {(["24h", "7d", "30d"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setReportRange(r)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-bold transition-all ${
                    reportRange === r 
                      ? "bg-red-600 text-white shadow-md shadow-blue-500/20" 
                      : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-zinc-50 dark:bg-zinc-950/50 rounded-sm p-4 border border-zinc-100 dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-sm flex items-center justify-center text-red-600 dark:text-red-400">
                <Zap size={24} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Axion Intelligence Engine</h4>
                <p className="text-[11px] text-zinc-500">O sistema analisará {reportRange === "24h" ? "as últimas 24 horas" : reportRange === "7d" ? "a última semana" : "o último mês"} de telemetria.</p>
              </div>
            </div>
            <button
              onClick={generateHealthReport}
              disabled={isGenerating}
              className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-zinc-900 dark:bg-red-600 hover:bg-black dark:hover:bg-red-700 text-white rounded-sm font-black text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processando Dados...
                </>
              ) : (
                <>
                  <FileText size={18} />
                  Gerar relatório (PDF)
                </>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Feed de Anomalias Críticas (Live Error Console) */}
      {apm && (
        <Card className="bg-[#09090b] border-zinc-800 text-zinc-100 overflow-hidden rounded-sm shadow-md">
          <CardHeader className="bg-zinc-950/60 border-b border-zinc-800/80 px-4 py-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal size={15} className="text-amber-400" />
              <span className="text-xs font-bold tracking-wider uppercase font-mono text-zinc-300">Live Tail Stream (Erros Críticos do Backend)</span>
            </div>
            <span className="text-[10px] font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">
              Últimas {apm.recentLogs?.length || 0} anomalias
            </span>
          </CardHeader>
          <CardContent className="p-4 font-mono text-xs max-h-60 overflow-y-auto space-y-2 custom-scrollbar select-text">
            {!apm.recentLogs || apm.recentLogs.length === 0 ? (
              <p className="text-zinc-600 text-center py-6 font-sans italic">Nenhum erro de nível WARN ou ERROR registrado na memória recente.</p>
            ) : (
              apm.recentLogs.map((logItem, idx) => (
                <div key={idx} className="leading-relaxed border-b border-zinc-800/40 pb-2 last:border-none">
                  <span className="text-zinc-500 mr-2">[{new Date(logItem.timestamp).toLocaleTimeString()}]</span>
                  <span className={`px-1 rounded text-[10px] font-bold mr-2 ${
                    logItem.level === "ERROR" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                  }`}>
                    {logItem.level}
                  </span>
                  <span className="text-zinc-300 break-all">{logItem.message}</span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {wipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
          <div className="bg-white dark:bg-[#0A0A0C] border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800 rounded-none shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-zinc-50 dark:bg-zinc-950 p-6 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center gap-3">
              <div className="bg-red-100 dark:bg-red-950/40 p-2.5 border border-red-200 dark:border-red-900/50 rounded-none text-red-600 dark:text-red-500">
                <AlertTriangle size={24} className="animate-bounce" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-tight">Atenção Crítica</h3>
                  <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1 py-0.5 rounded-sm">SYS-RESET</span>
                </div>
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Ação Irreversível de Infraestrutura</p>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-6 leading-relaxed">
                Você está prestes a apagar completamente todos os registros do sistema (chamados, logs, usuários, etc), deixando apenas o usuário <strong>AxionAdmin</strong> configurado de fábrica.
              </p>
              
              <div className="space-y-2 mb-6">
                <label className="text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-widest block">
                  Autenticação de Segurança (Senha SuperAdmin):
                </label>
                <input
                  type="password"
                  value={wipePassword}
                  onChange={(e) => setWipePassword(e.target.value)}
                  placeholder="Informe sua senha..."
                  className="w-full h-11 px-4 rounded-none border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 focus:border-red-500 focus:bg-white dark:focus:bg-zinc-900 transition-colors outline-none shadow-sm dark:text-zinc-100"
                />
              </div>
              
              <div className="flex gap-3 justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                <button
                  onClick={() => {
                    setWipeModalOpen(false);
                    setWipePassword("");
                  }}
                  className="px-5 py-2.5 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-none transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleWipeDb}
                  disabled={acting || !wipePassword}
                  className="px-5 py-2.5 text-xs font-black bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-none shadow-md disabled:opacity-50 transition-colors"
                >
                  {acting ? "Limpando..." : "Confirmar Reset"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Template Oculto para o Relatório de Saúde PDF */}
      <div id="health-report-pdf-template" style={{ display: 'none', background: 'white', color: 'black', padding: '40px', width: '800px', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '4px solid #DC2626', paddingBottom: '20px', marginBottom: '30px' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '24px', color: '#1e3a8a', fontWeight: 800 }}>AXION HEALTH AUDIT</h1>
            <p style={{ margin: 0, color: '#64748b', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '2px' }}>Relatório Técnico de Observabilidade</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '10px', fontWeight: 700 }}>GERADO EM: {new Date().toLocaleString()}</p>
            <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>PERÍODO: {reportRange.toUpperCase()}</p>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '14px', background: '#f1f5f9', padding: '10px', borderRadius: '5px' }}>1. STATUS DA INFRAESTRUTURA</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '15px' }}>
            <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '10px' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>UPTIME DO SERVIDOR</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 700 }}>{formatUptime(health.uptime)}</p>
            </div>
            <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '10px' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>STATUS MONGODB</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 700, color: health.services.mongodb === 'connected' ? '#10b981' : '#ef4444' }}>
                {health.services.mongodb === 'connected' ? 'OPERACIONAL' : 'FALHA'}
              </p>
            </div>
            <div style={{ border: '1px solid #e2e8f0', padding: '15px', borderRadius: '10px' }}>
              <p style={{ margin: 0, fontSize: '10px', color: '#64748b' }}>STATUS REDIS CACHE</p>
              <p style={{ margin: '5px 0 0 0', fontSize: '18px', fontWeight: 700, color: health.services.redis === 'connected' ? '#10b981' : '#ef4444' }}>
                {health.services.redis === 'connected' ? 'OPERACIONAL' : 'FALHA'}
              </p>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ fontSize: '14px', background: '#f1f5f9', padding: '10px', borderRadius: '5px' }}>2. TELEMETRIA MÉDIA DO PERÍODO</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>Carga Média de CPU</td>
                <td style={{ padding: '12px', fontSize: '12px', fontWeight: 700 }}>{health.system.cpu_load[0].toFixed(2)}%</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>Consumo de Memória (App)</td>
                <td style={{ padding: '12px', fontSize: '12px', fontWeight: 700 }}>{health.system.memory_app_used_mb} MB</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px', fontSize: '12px', color: '#475569' }}>Latência Média de Resposta</td>
                <td style={{ padding: '12px', fontSize: '12px', fontWeight: 700 }}>{apm?.avgLatencyMs || 0} ms</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '15px', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '14px', color: '#1e3a8a', marginBottom: '10px' }}>3. DIAGNÓSTICO DE INTELIGÊNCIA</h2>
          <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
            <p><strong>Status Geral:</strong> O sistema operou com estabilidade nominal. Não foram detectados vazamentos de memória críticos ou gargalos de CPU que comprometam a operação industrial no curto prazo.</p>
            <p style={{ marginTop: '10px' }}><strong>Ações Recomendadas:</strong></p>
            <ul style={{ paddingLeft: '20px' }}>
              <li>Monitorar picos de latência durante as trocas de turno (pico de tráfego).</li>
              <li>Manter a limpeza semanal de cache do Redis para otimização de performance.</li>
              <li>Realizar backup preventivo do MongoDB mensalmente.</li>
            </ul>
          </div>
        </div>

        <div style={{ marginTop: '40px', textAlign: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
          <p style={{ fontSize: '9px', color: '#94a3b8' }}>AXION TECHNOLOGY - PLATAFORMA DE OPERAÇÕES INDUSTRIAIS</p>
        </div>
      </div>
    </div>
  );
}
