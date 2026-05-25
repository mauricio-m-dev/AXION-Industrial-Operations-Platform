import React from "react";
import { createPortal } from "react-dom";

interface Ticket {
  id: string;
  type: string;
  location: string;
  status: string;
  created_at: string;
}

interface Stats {
  total: number;
  efficiency: number;
  availability: number;
  criticalFailures: number;
  avgResolution: number;
  mtbf: number;
  avgResponse: number;
  topCategory: string;
  topEquipments: string;
}

interface WeeklyReportPDFTemplateProps {
  stats: Stats;
  filteredTickets: Ticket[];
  getTranzincdType: (type: string) => string;
  reportPeriod: string;
  startDate: string;
  endDate: string;
}

export const WeeklyReportPDFTemplate: React.FC<WeeklyReportPDFTemplateProps> = ({
  stats,
  filteredTickets,
  getTranzincdType,
  reportPeriod,
  startDate,
  endDate,
}) => {
  // Dados do usuário logado dinâmicos
  const username = localStorage.getItem("admin-username") || "Técnico Operacional";
  const matricula = localStorage.getItem("admin-matricula") || "---";

  // Formatação amigável do período analisado
  const getPeriodLabel = () => {
    if (reportPeriod === "last7") return "Últimos 7 dias";
    if (reportPeriod === "thisWeek") return "Esta Semana";
    if (reportPeriod === "lastWeek") return "Semana Passada";
    if (reportPeriod === "custom") {
      const startStr = startDate ? new Date(startDate + "T00:00:00").toLocaleDateString('pt-BR') : "N/A";
      const endStr = endDate ? new Date(endDate + "T00:00:00").toLocaleDateString('pt-BR') : "N/A";
      return `${startStr} a ${endStr}`;
    }
    return "Período Personalizado";
  };
  const periodLabel = getPeriodLabel();

  return createPortal(
    <div id="professional-report-container" className="hidden print:block relatorio-padrao print-only-abnt">
      
      {/* 1. Capa ABNT */}
      <div className="report-cover">
        <div className="cover-header">
          <p className="abnt-logo-text">AXION TECHNOLOGY</p>
          <p className="abnt-department">Manutenção & Operações Industriais</p>
        </div>

        <div className="cover-middle">
          <h1 className="cover-title">Relatório de Resultados: Performance Operacional</h1>
          <div className="cover-divider"></div>
          <p className="cover-subtitle">Relatório de Operação</p>
        </div>

        <div className="cover-metadata">
          <p><strong>Período Analisado:</strong> {periodLabel}</p>
          <p><strong>Setor/Área:</strong> Manutenção Geral (AGV / Downtime)</p>
          <p><strong>Responsável Técnico:</strong> {username} (Mtr: {matricula})</p>
          <p><strong>Data de Emissão:</strong> {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="cover-footer">
          <p>CLASSIFICAÇÃO: USO INTERNO - CONFIDENCIAL</p>
        </div>
      </div>

      {/* 2. Sumário ABNT */}
      <div className="abnt-sumario">
        <h2 className="sumario-title">Sumário</h2>
        
        <div className="sumario-row">
          <div>
            <span className="sumario-section-num">1</span>
            <span className="sumario-section-title">OBJETIVO</span>
          </div>
          <div className="sumario-dots"></div>
          <div>02</div>
        </div>

        <div className="sumario-row">
          <div>
            <span className="sumario-section-num">2</span>
            <span className="sumario-section-title">METODOLOGIA / DADOS BASE</span>
          </div>
          <div className="sumario-dots"></div>
          <div>02</div>
        </div>

        <div className="sumario-row">
          <div>
            <span className="sumario-section-num">3</span>
            <span className="sumario-section-title">ANÁLISE / RESULTADOS</span>
          </div>
          <div className="sumario-dots"></div>
          <div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div>
            <span className="sumario-section-num">3.1</span>
            <span>Resumo Operacional</span>
          </div>
          <div className="sumario-dots"></div>
          <div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div>
            <span className="sumario-section-num">3.2</span>
            <span>Indicadores Chave de Desempenho (KPIs)</span>
          </div>
          <div className="sumario-dots"></div>
          <div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div>
            <span className="sumario-section-num">3.3</span>
            <span>Análise de Categoria Principal</span>
          </div>
          <div className="sumario-dots"></div>
          <div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div>
            <span className="sumario-section-num">3.4</span>
            <span>Registro Cronológico (Amostragem)</span>
          </div>
          <div className="sumario-dots"></div>
          <div>03</div>
        </div>

        <div className="sumario-row">
          <div>
            <span className="sumario-section-num">4</span>
            <span className="sumario-section-title">CONCLUSÃO / CONSIDERAÇÕES FINAIS</span>
          </div>
          <div className="sumario-dots"></div>
          <div>03</div>
        </div>
      </div>

      {/* 3. Corpo do Relatório */}
      <h2 className="abnt-section">1 Objetivo</h2>
      <p className="abnt-paragraph">
        O presente relatório operacional tem por objetivo formalizar o fluxo de chamados de manutenção e acompanhamento de incidentes industriais no chão de fábrica da planta. O propósito estratégico consiste na identificação de gargalos de atendimento e no cálculo exato de tempos de indisponibilidade (Downtime) para direcionar as tomadas de decisões de engenharia e otimização do tempo médio de reparo.
      </p>

      <h2 className="abnt-section">2 Metodologia / Dados Base</h2>
      <p className="abnt-paragraph">
        Os dados e indicadores base que sustentam este documento foram gerados e capturados de forma automatizada por intermédio das APIs e do banco de dados histórico da plataforma AXION. A amostragem compreende o período operacional de <strong>{periodLabel}</strong>, considerando todas as ocorrências de movimentação, AGVs, falhas eletrônicas e mecânicas registradas e encerradas na base do sistema.
      </p>

      <h2 className="abnt-section">3 Análise / Resultados</h2>
      <p className="abnt-paragraph">
        Abaixo estão detalhados os resultados quantitativos de performance do chão de fábrica obtidos no período analisado, estruturados a partir das métricas gerais, dos tempos operacionais de resposta e das falhas mais recorrentes.
      </p>

      <h3 className="abnt-subsection">3.1 Resumo Operacional</h3>
      <table className="abnt-table">
        <thead>
          <tr>
            <th>Métrica Operacional</th>
            <th className="text-right">Valor Consolidado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total de Chamados Registrados</td>
            <td className="text-right">{stats.total}</td>
          </tr>
          <tr>
            <td>Taxa de Eficiência de Atendimento (Encerramentos rápidos)</td>
            <td className="text-right">{stats.efficiency}%</td>
          </tr>
          <tr>
            <td>Disponibilidade Média Estimada da Linha</td>
            <td className="text-right">{stats.availability}%</td>
          </tr>
          <tr>
            <td>Quantidade de Ocorrências Críticas (Parada de Linha)</td>
            <td className="text-right">{stats.criticalFailures}</td>
          </tr>
        </tbody>
      </table>

      <h3 className="abnt-subsection">3.2 Indicadores Chave de Desempenho (KPIs)</h3>
      <table className="abnt-table">
        <thead>
          <tr>
            <th>Indicador Técnico</th>
            <th className="text-right">Tempo Médio Registrado</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Tempo Médio de Reparo (MTTR)</td>
            <td className="text-right">{stats.avgResolution} min</td>
          </tr>
          <tr>
            <td>Tempo Médio Entre Falhas (MTBF)</td>
            <td className="text-right">{stats.mtbf} min</td>
          </tr>
          <tr>
            <td>Tempo Médio de Resposta / Primeiro Contato (FRT)</td>
            <td className="text-right">{stats.avgResponse} min</td>
          </tr>
        </tbody>
      </table>

      <h3 className="abnt-subsection">3.3 Análise de Categoria Principal</h3>
      <p className="abnt-paragraph">
        O diagnóstico automatizado indicou que a categoria de incidente com maior representatividade no período foi <strong>{stats.topCategory || "N/A"}</strong>. Os equipamentos e ativos industriais que apresentaram o maior índice de reincidência de falha e necessitam de inspeção imediata são: <strong>{stats.topEquipments || "Nenhum ativo crítico registrado"}</strong>. Recomenda-se o reabastecimento preventivo de inventário e alocação de técnicos dedicados às áreas físicas destes ativos para redução de gargalos de suporte.
      </p>

      <div className="page-break"></div>

      <h3 className="abnt-subsection">3.4 Registro Cronológico (Amostragem de Chamados)</h3>
      <p className="abnt-paragraph">
        Mapeamento cronológico dos últimos registros de incidentes abertos sob o período de auditoria atual:
      </p>
      <table className="abnt-table">
        <thead>
          <tr>
            <th>Protocolo</th>
            <th>Categoria</th>
            <th>Localização</th>
            <th>Data/Hora Abertura</th>
            <th>Status do Chamado</th>
          </tr>
        </thead>
        <tbody>
          {filteredTickets.slice(0, 20).map(t => (
            <tr key={t.id}>
              <td>{t.id.substring(0, 8)}</td>
              <td>{getTranzincdType(t.type)}</td>
              <td>{t.location || '---'}</td>
              <td>{new Date(t.created_at).toLocaleString('pt-BR')}</td>
              <td>{t.status}</td>
            </tr>
          ))}
          {filteredTickets.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center">Nenhum registro encontrado no período.</td>
            </tr>
          )}
        </tbody>
      </table>
      
      {filteredTickets.length > 20 && (
        <p style={{ fontSize: '10pt', textAlign: 'center', marginTop: '10pt', color: '#666' }}>
          * Exibindo apenas os 20 registros mais recentes. Outros {filteredTickets.length - 20} registros foram omitidos para preservação de espaço físico.
        </p>
      )}

      <h2 className="abnt-section">4 Conclusão / Considerações Finais</h2>
      <p className="abnt-paragraph">
        Com base no tempo médio de reparo (MTTR) consolidado de <strong>{stats.avgResolution} minutos</strong>, a performance das equipes de manutenção encontra-se em níveis aceitáveis, embora a categoria <strong>{stats.topCategory || "N/A"}</strong> represente um desvio relevante no tempo de operação contínua. Para a próxima janela operacional, sugere-se a aplicação das inspeções preventivas recomendadas nos ativos <strong>{stats.topEquipments || "recorrentes"}</strong> para restabelecer a estabilidade e atingir as metas de disponibilidade de linha estimadas.
      </p>

      <br /><br /><br />
      <div style={{ textAlign: 'center', marginTop: '45pt', pageBreakInside: 'avoid' }}>
        <hr style={{ width: '6cm', border: 'none', borderTop: '1px solid black', margin: '0 auto 10pt auto' }} />
        <p style={{ fontSize: '10pt', margin: 0, fontWeight: 'bold' }}>{username}</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>Responsável Técnico de Operações</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>Axion Industrial Platform</p>
      </div>

    </div>,
    document.body
  );
};
