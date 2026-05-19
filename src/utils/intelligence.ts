/**
 * Axion Intelligence Module
 * Automated system health diagnosis and optimization recommendations.
 */

export interface SystemMetrics {
  avgCpu: number;
  avgRam: number;
  errorRate: number;
  avgLatency: number;
  dbLatency: number;
}

export interface Diagnosis {
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  score: number;
  status: string;
  recommendations: string[];
  findings: string[];
}

export function analyzeSystemHealth(metrics: SystemMetrics): Diagnosis {
  const recommendations: string[] = [];
  const findings: string[] = [];
  let score = 100;

  // CPU Analysis
  if (metrics.avgCpu > 0.85) {
    score -= 30;
    findings.push("Carga de CPU extremamente alta detectada consistentemente.");
    recommendations.push("Escalonamento vertical (mais cores) ou otimização de loops pesados no backend.");
  } else if (metrics.avgCpu > 0.6) {
    score -= 10;
    findings.push("Uso de CPU acima da média observada.");
    recommendations.push("Verifique se há processos de processamento de imagem ou relatórios que podem ser movidos para workers em background.");
  }

  // RAM Analysis
  if (metrics.avgRam > 90) {
    score -= 25;
    findings.push("Memória do sistema quase saturada.");
    recommendations.push("Verifique possíveis memory leaks no Node.js ou aumente a RAM do servidor.");
  }

  // Latency Analysis
  if (metrics.avgLatency > 1000) {
    score -= 20;
    findings.push("Latência de API degradada (T > 1s).");
    recommendations.push("Otimize as rotas de busca de tickets; implemente paginação mais agressiva ou cache de borda.");
  } else if (metrics.dbLatency > 100) {
    score -= 15;
    findings.push("Consultas ao MongoDB apresentando lentidão.");
    recommendations.push("Adicione índices nos campos mais filtrados (ex: status, type, location) e revise o pool de conexões.");
  }

  // Error Rate
  if (metrics.errorRate > 10) {
    score -= 25;
    findings.push("Taxa de erros HTTP alarmante (>10%).");
    recommendations.push("Revise os logs de erro para identificar falhas recorrentes em integrações ou validações de formulário.");
  }

  let riskLevel: Diagnosis['riskLevel'] = 'Low';
  let status = "Saudável";

  if (score < 40) {
    riskLevel = 'Critical';
    status = "Crítico - Intervenção Imediata";
  } else if (score < 65) {
    riskLevel = 'High';
    status = "Alerta - Risco de Instabilidade";
  } else if (score < 85) {
    riskLevel = 'Medium';
    status = "Atenção - Oportunidade de Otimização";
  }

  if (recommendations.length === 0) {
    recommendations.push("Mantenha as rotinas de limpeza de log e backup do banco de dados.");
  }

  return {
    riskLevel,
    score: Math.max(0, score),
    status,
    recommendations,
    findings
  };
}
