import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.98, opacity: 0, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-[#0A0A0C] w-full max-w-4xl rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border-l-4 border-l-[#DC2626] border border-zinc-200 dark:border-zinc-800"
          >
            <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
                  <ShieldCheck size={20} className="animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black tracking-tight text-zinc-900 dark:text-white uppercase">Diretrizes de Acesso & SLA</h2>
                    <span className="text-[9px] font-mono bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 px-1.5 py-0.5 font-bold">V2.4</span>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">AXION TECHNOLOGY SECURITY PROTOCOL</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} className="rounded-none hover:bg-zinc-200 dark:hover:bg-zinc-900 text-zinc-400 hover:text-zinc-950 dark:hover:text-white">
                <X size={20} />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed custom-scrollbar bg-white dark:bg-[#0C0C0E]">
              <div className="space-y-2">
                <div className="text-[9px] font-mono text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">// PROTOCOLO 01</div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-2">ACEITE CORPORATIVO E MONITORAMENTO</h3>
                <p>O presente instrumento constitui um Acordo Legal B2B estrito e vinculativo. O acesso e a operação da <strong>AXION INDUSTRIAL OPERATIONS PLATFORM</strong> implicam na <strong>concordância expressa, irrevogável e irrestrita</strong> de que o sistema é um ambiente corporativo monitorado. Todas as ações sistêmicas, requisições, interações de rede e telemetria poderão ser auditadas e registradas (logs) para fins de <em>compliance</em>, segurança e integridade operacional.</p>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">// PROTOCOLO 02</div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-2">PROPRIEDADE INTELECTUAL E PROTEÇÃO DA MARCA</h3>
                <p>A plataforma sistêmica, incluindo seu código-fonte, metodologias operacionais, arquitetura em nuvem, bancos de dados, APIs, infraestrutura e identidade visual, constitui <strong>propriedade intelectual inalienável e exclusiva da AXION TECHNOLOGY</strong>. É terminantemente proibido o emprego de técnicas de engenharia reversa, sublicenciamento, cópia não autorizada ou qualquer forma de replicação industrial sob pena de sanções cíveis e criminais severas.</p>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">// PROTOCOLO 03</div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-2">USO AUTORIZADO E RESTRIÇÕES ENTERPRISE</h3>
                <p>O licenciamento de acesso (SaaS) é estritamente limitado ao perímetro corporativo contratado. A utilização da solução fora do escopo homologado ou o repasse de credenciais de acesso corporativo a terceiros concorrentes caracteriza quebra grave de confidencialidade (NDA), sujeitando o infrator ao bloqueio sumário de credenciais e ações compensatórias imediatas.</p>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">// PROTOCOLO 04</div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-2">Nível de Serviço (SLA) e Suporte</h3>
                <p>A AXION assegura um <em>uptime</em> mínimo de 99,5% ao mês, excluindo indisponibilidades geradas por manutenção programada, falhas globais de provedores de nuvem ou deficiências na infraestrutura de rede local do próprio CLIENTE.</p>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">// PROTOCOLO 05</div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-2">COMPLIANCE, LGPD E RESPONSABILIDADE DOS DADOS</h3>
                <p>Em plena conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong>, a Pessoa Jurídica contratante figura legalmente como <strong>CONTROLADORA</strong> exclusiva dos dados operacionais e informações imputadas no sistema. A AXION TECHNOLOGY atua estritamente na qualidade de <strong>OPERADORA</strong>, garantindo o devido <em>hardening</em> tecnológico e segurança da infraestrutura. A responsabilidade pela veracidade, conformidade e legalidade das informações trafegadas é inteira e incondicional da Contratante e de seus operadores autorizados.</p>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">// PROTOCOLO 06</div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-2">LIMITAÇÃO DE RESPONSABILIDADE INDUSTRIAL</h3>
                <p>A Plataforma é fornecida no estado da arte técnico sob rigoroso Acordo de Nível de Serviço (SLA). Contudo, a AXION TECHNOLOGY <strong>exime-se expressamente</strong> de toda e qualquer responsabilidade civil ou financeira sobre perdas indiretas, lucros cessantes operacionais, atrasos logísticos na linha de montagem, ou falhas na salvaguarda de processos industriais decorrentes de má utilização do sistema pelos operadores logados.</p>
              </div>

              <div className="space-y-2">
                <div className="text-[9px] font-mono text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">// PROTOCOLO 07</div>
                <h3 className="text-sm font-black text-zinc-900 dark:text-zinc-100 uppercase tracking-wide border-b border-zinc-100 dark:border-zinc-800 pb-2">Disposições Gerais e Foro</h3>
                <p>O atraso de pagamentos ou violação de Propriedade Intelectual autoriza a suspensão e rescisão motivada do contrato. Fica eleito o Foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias, aplicando-se exclusivamente as leis brasileiras.</p>
              </div>

              <p className="text-xs text-center text-zinc-400 dark:text-zinc-500 pt-4 border-t border-zinc-100 dark:border-zinc-800/80 mt-6">
                Este Termo Eletrônico e Consentimento B2B possui plena validade jurídica probatória para auditoria corporativa e conformidade legal nos termos da Medida Provisória nº 2.200-2/2001.
              </p>
            </div>
            
            <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0 flex justify-end">
              <Button onClick={onClose} className="font-bold bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-none px-8 shadow-sm">
                Aceitar Diretrizes Corporativas
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
