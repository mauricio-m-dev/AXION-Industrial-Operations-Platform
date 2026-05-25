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
  t: (key: string) => string;
}

export const WeeklyReportPDFTemplate: React.FC<WeeklyReportPDFTemplateProps> = ({
  stats,
  filteredTickets,
  getTranzincdType,
  reportPeriod,
  startDate,
  endDate,
  t,
}) => {
  // Helper to fallback to default pt-BR strings if translation key is missing
  const pdfT = (key: string, fallback: string) => {
    const tr = t(key);
    return tr === key ? fallback : tr;
  };

  const username = localStorage.getItem("admin-username") || pdfT("pdf.operator_default", "Técnico Operacional");
  const matricula = localStorage.getItem("admin-matricula") || "---";

  const getPeriodLabel = () => {
    if (reportPeriod === "last7") return pdfT("filter.last7", "Últimos 7 dias");
    if (reportPeriod === "thisWeek") return pdfT("filter.this_week", "Esta Semana");
    if (reportPeriod === "lastWeek") return pdfT("filter.last_week", "Semana Passada");
    if (reportPeriod === "custom") {
      const startStr = startDate ? new Date(startDate + "T00:00:00").toLocaleDateString('pt-BR') : "N/A";
      const endStr = endDate ? new Date(endDate + "T00:00:00").toLocaleDateString('pt-BR') : "N/A";
      return `${startStr} - ${endStr}`;
    }
    return pdfT("filter.custom", "Período Personalizado");
  };
  const periodLabel = getPeriodLabel();

  return createPortal(
    <div id="professional-report-container" className="hidden print:block relatorio-padrao print-only-abnt">
      
      {/* 1. Capa ABNT */}
      <div className="report-cover">
        <div className="cover-header">
          <p className="abnt-logo-text">{pdfT("pdf.company", "AXION TECHNOLOGY")}</p>
          <p className="abnt-department">{pdfT("pdf.department", "Manutenção & Operações Industriais")}</p>
        </div>

        <div className="cover-middle">
          <h1 className="cover-title">{pdfT("pdf.title", "Relatório de Resultados: Performance Operacional")}</h1>
          <div className="cover-divider"></div>
          <p className="cover-subtitle">{pdfT("pdf.subtitle", "Relatório de Operação")}</p>
        </div>

        <div className="cover-metadata">
          <p><strong>{pdfT("pdf.period_label", "Período Analisado:")}</strong> {periodLabel}</p>
          <p><strong>{pdfT("pdf.sector_label", "Setor/Área:")}</strong> {pdfT("pdf.sector_value", "Manutenção Geral (AGV / Downtime)")}</p>
          <p><strong>{pdfT("pdf.responsible_label", "Responsável Técnico:")}</strong> {username} (Mtr: {matricula})</p>
          <p><strong>{pdfT("pdf.emission_label", "Data de Emissão:")}</strong> {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        <div className="cover-footer">
          <p>{pdfT("pdf.classification", "CLASSIFICAÇÃO: USO INTERNO - CONFIDENCIAL")}</p>
        </div>
      </div>

      {/* 2. Sumário ABNT */}
      <div className="abnt-sumario">
        <h2 className="sumario-title">{pdfT("pdf.summary", "Sumário")}</h2>
        
        <div className="sumario-row">
          <div><span className="sumario-section-num">1</span><span className="sumario-section-title">{pdfT("pdf.sec1", "OBJETIVO")}</span></div>
          <div className="sumario-dots"></div><div>02</div>
        </div>

        <div className="sumario-row">
          <div><span className="sumario-section-num">2</span><span className="sumario-section-title">{pdfT("pdf.sec2", "METODOLOGIA / DADOS BASE")}</span></div>
          <div className="sumario-dots"></div><div>02</div>
        </div>

        <div className="sumario-row">
          <div><span className="sumario-section-num">3</span><span className="sumario-section-title">{pdfT("pdf.sec3", "ANÁLISE / RESULTADOS")}</span></div>
          <div className="sumario-dots"></div><div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div><span className="sumario-section-num">3.1</span><span>{pdfT("pdf.sec3_1", "Resumo Operacional")}</span></div>
          <div className="sumario-dots"></div><div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div><span className="sumario-section-num">3.2</span><span>{pdfT("pdf.sec3_2", "Indicadores Chave de Desempenho (KPIs)")}</span></div>
          <div className="sumario-dots"></div><div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div><span className="sumario-section-num">3.3</span><span>{pdfT("pdf.sec3_3", "Análise de Categoria Principal")}</span></div>
          <div className="sumario-dots"></div><div>02</div>
        </div>

        <div className="sumario-row" style={{ paddingLeft: '15px' }}>
          <div><span className="sumario-section-num">3.4</span><span>{pdfT("pdf.sec3_4", "Registro Cronológico (Amostragem)")}</span></div>
          <div className="sumario-dots"></div><div>03</div>
        </div>

        <div className="sumario-row">
          <div><span className="sumario-section-num">4</span><span className="sumario-section-title">{pdfT("pdf.sec4", "CONCLUSÃO / CONSIDERAÇÕES FINAIS")}</span></div>
          <div className="sumario-dots"></div><div>03</div>
        </div>
      </div>

      {/* 3. Corpo do Relatório */}
      <h2 className="abnt-section">1 {pdfT("pdf.sec1", "Objetivo")}</h2>
      <p className="abnt-paragraph">
        {pdfT("pdf.obj_text", "O presente relatório operacional tem por objetivo formalizar o fluxo de chamados de manutenção e acompanhamento de incidentes industriais no chão de fábrica da planta. O propósito estratégico consiste na identificação de gargalos de atendimento e no cálculo exato de tempos de indisponibilidade (Downtime) para direcionar as tomadas de decisões de engenharia e otimização do tempo médio de reparo.")}
      </p>

      <h2 className="abnt-section">2 {pdfT("pdf.sec2", "Metodologia / Dados Base")}</h2>
      <p className="abnt-paragraph">
        {pdfT("pdf.method_text", "Os dados e indicadores base que sustentam este documento foram gerados e capturados de forma automatizada por intermédio das APIs e do banco de dados histórico da plataforma AXION. A amostragem compreende o período operacional de")} <strong>{periodLabel}</strong>, {pdfT("pdf.method_text_2", "considerando todas as ocorrências de movimentação, AGVs, falhas eletrônicas e mecânicas registradas e encerradas na base do sistema.")}
      </p>

      <h2 className="abnt-section">3 {pdfT("pdf.sec3", "Análise / Resultados")}</h2>
      <p className="abnt-paragraph">
        {pdfT("pdf.analysis_text", "Abaixo estão detalhados os resultados quantitativos de performance do chão de fábrica obtidos no período analisado, estruturados a partir das métricas gerais, dos tempos operacionais de resposta e das falhas mais recorrentes.")}
      </p>

      <h3 className="abnt-subsection">3.1 {pdfT("pdf.sec3_1", "Resumo Operacional")}</h3>
      <table className="abnt-table">
        <thead>
          <tr>
            <th>{pdfT("pdf.metric", "Métrica Operacional")}</th>
            <th className="text-right">{pdfT("pdf.value", "Valor Consolidado")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{pdfT("pdf.total_tickets", "Total de Chamados Registrados")}</td>
            <td className="text-right">{stats.total}</td>
          </tr>
          <tr>
            <td>{pdfT("pdf.efficiency", "Taxa de Eficiência de Atendimento (Encerramentos rápidos)")}</td>
            <td className="text-right">{stats.efficiency}%</td>
          </tr>
          <tr>
            <td>{pdfT("pdf.availability", "Disponibilidade Média Estimada da Linha")}</td>
            <td className="text-right">{stats.availability}%</td>
          </tr>
          <tr>
            <td>{pdfT("pdf.critical", "Quantidade de Ocorrências Críticas (Parada de Linha)")}</td>
            <td className="text-right">{stats.criticalFailures}</td>
          </tr>
        </tbody>
      </table>

      <h3 className="abnt-subsection">3.2 {pdfT("pdf.sec3_2", "Indicadores Chave de Desempenho (KPIs)")}</h3>
      <table className="abnt-table">
        <thead>
          <tr>
            <th>{pdfT("pdf.kpi", "Indicador Técnico")}</th>
            <th className="text-right">{pdfT("pdf.kpi_value", "Tempo Médio Registrado")}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{pdfT("pdf.mttr", "Tempo Médio de Reparo (MTTR)")}</td>
            <td className="text-right">{stats.avgResolution} min</td>
          </tr>
          <tr>
            <td>{pdfT("pdf.mtbf", "Tempo Médio Entre Falhas (MTBF)")}</td>
            <td className="text-right">{stats.mtbf} min</td>
          </tr>
          <tr>
            <td>{pdfT("pdf.frt", "Tempo Médio de Resposta / Primeiro Contato (FRT)")}</td>
            <td className="text-right">{stats.avgResponse} min</td>
          </tr>
        </tbody>
      </table>

      <h3 className="abnt-subsection">3.3 {pdfT("pdf.sec3_3", "Análise de Categoria Principal")}</h3>
      <p className="abnt-paragraph">
        {pdfT("pdf.cat_text_1", "O diagnóstico automatizado indicou que a categoria de incidente com maior representatividade no período foi")} <strong>{stats.topCategory ? getTranzincdType(stats.topCategory) : "N/A"}</strong>. {pdfT("pdf.cat_text_2", "Os equipamentos e ativos industriais que apresentaram o maior índice de reincidência de falha e necessitam de inspeção imediata são:")} <strong>{stats.topEquipments || pdfT("pdf.no_critical_assets", "Nenhum ativo crítico registrado")}</strong>. {pdfT("pdf.cat_text_3", "Recomenda-se o reabastecimento preventivo de inventário e alocação de técnicos dedicados às áreas físicas destes ativos para redução de gargalos de suporte.")}
      </p>

      <div className="page-break"></div>

      <h3 className="abnt-subsection">3.4 {pdfT("pdf.sec3_4", "Registro Cronológico (Amostragem de Chamados)")}</h3>
      <p className="abnt-paragraph">
        {pdfT("pdf.chrono_text", "Mapeamento cronológico dos últimos registros de incidentes abertos sob o período de auditoria atual:")}
      </p>
      <table className="abnt-table">
        <thead>
          <tr>
            <th>{t("table.proto")}</th>
            <th>{t("report.cat")}</th>
            <th>{t("modal.loc")}</th>
            <th>{t("report.data")}</th>
            <th>{t("table.status")}</th>
          </tr>
        </thead>
        <tbody>
          {filteredTickets.slice(0, 20).map(tItem => (
            <tr key={tItem.id}>
              <td>{tItem.id.substring(0, 8)}</td>
              <td>{getTranzincdType(tItem.type)}</td>
              <td>{tItem.location || '---'}</td>
              <td>{new Date(tItem.created_at).toLocaleString('pt-BR')}</td>
              <td>{t(`status.${tItem.status.toLowerCase() === 'aberto' ? 'open' : tItem.status.toLowerCase() === 'finalizado' ? 'finished' : 'progress'}`) || tItem.status}</td>
            </tr>
          ))}
          {filteredTickets.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center">{pdfT("pdf.no_records", "Nenhum registro encontrado no período.")}</td>
            </tr>
          )}
        </tbody>
      </table>
      
      {filteredTickets.length > 20 && (
        <p style={{ fontSize: '10pt', textAlign: 'center', marginTop: '10pt', color: '#666' }}>
          * {pdfT("pdf.omitted", "Exibindo apenas os 20 registros mais recentes. Outros")} {filteredTickets.length - 20} {pdfT("pdf.omitted_2", "registros foram omitidos para preservação de espaço físico.")}
        </p>
      )}

      <h2 className="abnt-section">4 {pdfT("pdf.sec4", "Conclusão / Considerações Finais")}</h2>
      <p className="abnt-paragraph">
        {pdfT("pdf.conc_text_1", "Com base no tempo médio de reparo (MTTR) consolidado de")} <strong>{stats.avgResolution} {pdfT("pdf.minutes", "minutos")}</strong>, {pdfT("pdf.conc_text_2", "a performance das equipes de manutenção encontra-se em níveis aceitáveis, embora a categoria")} <strong>{stats.topCategory ? getTranzincdType(stats.topCategory) : "N/A"}</strong> {pdfT("pdf.conc_text_3", "represente um desvio relevante no tempo de operação contínua. Para a próxima janela operacional, sugere-se a aplicação das inspeções preventivas recomendadas nos ativos")} <strong>{stats.topEquipments || pdfT("pdf.recurrent", "recorrentes")}</strong> {pdfT("pdf.conc_text_4", "para restabelecer a estabilidade e atingir as metas de disponibilidade de linha estimadas.")}
      </p>

      <br /><br /><br />
      <div style={{ textAlign: 'center', marginTop: '45pt', pageBreakInside: 'avoid' }}>
        <hr style={{ width: '6cm', border: 'none', borderTop: '1px solid black', margin: '0 auto 10pt auto' }} />
        <p style={{ fontSize: '10pt', margin: 0, fontWeight: 'bold' }}>{username}</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>{pdfT("pdf.role", "Responsável Técnico de Operações")}</p>
        <p style={{ fontSize: '9pt', margin: 0 }}>{pdfT("pdf.company_bottom", "Axion Industrial Platform")}</p>
      </div>

    </div>,
    document.body
  );
};
