import React from "react";

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
}

export const WeeklyReportPDFTemplate: React.FC<WeeklyReportPDFTemplateProps> = ({
  stats,
  filteredTickets,
  getTranzincdType,
}) => {
  return (
    <div id="professional-report-container" style={{ display: 'none', background: 'white', color: 'black', padding: '40px', width: '800px', fontFamily: 'sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '4px solid #1e3a8a', paddingBottom: '20px', marginBottom: '30px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '28px', color: '#1e3a8a', fontWeight: 800 }}>AXION TECHNOLOGY</h1>
          <p style={{ margin: '5px 0 0 0', color: '#64748b', fontSize: '12px', fontWeight: 600, letterSpacing: '1px' }}>ENTERPRISE OPERATIONS PLATFORM</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ margin: 0, fontSize: '12px', fontWeight: 700 }}>Relatório Executivo Operacional</p>
          <p style={{ margin: '3px 0 0 0', fontSize: '10px', color: '#64748b' }}>{new Date().toLocaleString()}</p>
        </div>
      </div>

      {/* Executive Summary */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', borderLeft: '4px solid #DC2626', paddingLeft: '10px', marginBottom: '20px', color: '#18181b' }}>1. RESUMO EXECUTIVO</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700 }}>TOTAL DE OCORRÊNCIAS</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 800 }}>{stats.total}</p>
          </div>
          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700 }}>EFICIÊNCIA OPERACIONAL</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#10b981' }}>{stats.efficiency}%</p>
          </div>
          <div style={{ padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#64748b', fontWeight: 700 }}>DISPONIBILIDADE</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#ef4444' }}>{stats.availability}%</p>
          </div>
          <div style={{ padding: '15px', background: '#fef2f2', borderRadius: '10px', border: '1px solid #fee2e2' }}>
            <p style={{ margin: 0, fontSize: '10px', color: '#ef4444', fontWeight: 700 }}>CHAMADOS CRÍTICOS</p>
            <p style={{ margin: '5px 0 0 0', fontSize: '20px', fontWeight: 800, color: '#b91c1c' }}>{stats.criticalFailures}</p>
          </div>
        </div>
      </div>

      {/* KPI Analysis */}
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '16px', borderLeft: '4px solid #DC2626', paddingLeft: '10px', marginBottom: '20px', color: '#18181b' }}>2. INDICADORES DE PERFORMANCE (KPIs)</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
              <th style={{ padding: '12px', fontSize: '11px', color: '#475569' }}>INDICADOR</th>
              <th style={{ padding: '12px', fontSize: '11px', color: '#475569' }}>VALOR MÉDIO</th>
              <th style={{ padding: '12px', fontSize: '11px', color: '#475569' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px', fontSize: '12px', fontWeight: 600 }}>MTTR (Tempo Médio de Reparo)</td>
              <td style={{ padding: '12px', fontSize: '12px' }}>{stats.avgResolution} minutos</td>
              <td style={{ padding: '12px', fontSize: '11px', color: stats.avgResolution < 30 ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                {stats.avgResolution < 30 ? 'DENTRO DA META' : 'ACIMA DO SLA'}
              </td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px', fontSize: '12px', fontWeight: 600 }}>MTBF (Tempo Médio Entre Falhas)</td>
              <td style={{ padding: '12px', fontSize: '12px' }}>{stats.mtbf} minutos</td>
              <td style={{ padding: '12px', fontSize: '11px', color: '#ef4444', fontWeight: 700 }}>ESTÁVEL</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
              <td style={{ padding: '12px', fontSize: '12px', fontWeight: 600 }}>Tempo Médio de Resposta</td>
              <td style={{ padding: '12px', fontSize: '12px' }}>{stats.avgResponse} minutos</td>
              <td style={{ padding: '12px', fontSize: '11px', color: '#10b981', fontWeight: 700 }}>EXCELENTE</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Intelligence Analysis */}
      <div style={{ marginBottom: '40px', background: '#eff6ff', padding: '25px', borderRadius: '15px', border: '1px solid #dbeafe' }}>
        <h2 style={{ fontSize: '16px', color: '#1e40af', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          ANÁLISE INTELIGENTE AXION
        </h2>
        <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#1e3a8a' }}>
          <p><strong>Diagnóstico Operacional:</strong> O sistema identificou que a categoria <strong>{stats.topCategory}</strong> é o principal gargalo no período, representando o maior volume de chamados.</p>
          <p style={{ marginTop: '10px' }}><strong>Recomendações:</strong></p>
          <ul style={{ paddingLeft: '20px' }}>
            <li>Verificar manutenção preventiva nos equipamentos: <strong>{stats.topEquipments}</strong>.</li>
            <li>Treinamento de reforço para operadores com alto volume de abertura de chamados duplicados.</li>
            <li>Ajustar o estoque de peças críticas para reduzir o tempo de finalização (MTTR).</li>
          </ul>
        </div>
      </div>

      {/* Detailed History */}
      <div style={{ pageBreakBefore: 'always' }}>
        <h2 style={{ fontSize: '16px', borderLeft: '4px solid #DC2626', paddingLeft: '10px', marginBottom: '20px', color: '#18181b' }}>3. HISTÓRICO DETALHADO DE OCORRÊNCIAS</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
          <thead>
            <tr style={{ background: '#09090b', color: 'white', textAlign: 'left' }}>
              <th style={{ padding: '10px' }}>PROTOCOLO</th>
              <th style={{ padding: '10px' }}>CATEGORIA</th>
              <th style={{ padding: '10px' }}>LOCALIZAÇÃO</th>
              <th style={{ padding: '10px' }}>DATA/HORA</th>
              <th style={{ padding: '10px' }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredTickets.slice(0, 50).map(t => (
              <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontWeight: 700, color: '#DC2626' }}>{t.id}</td>
                <td style={{ padding: '8px' }}>{getTranzincdType(t.type)}</td>
                <td style={{ padding: '8px' }}>{t.location}</td>
                <td style={{ padding: '8px' }}>{new Date(t.created_at).toLocaleString()}</td>
                <td style={{ padding: '8px', fontWeight: 700 }}>{t.status.toUpperCase()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredTickets.length > 50 && (
          <p style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '10px' }}>
            Exibindo as 50 ocorrências mais recentes. Para lista completa, consulte a exportação CSV.
          </p>
        )}
      </div>

      {/* Footer */}
      <div style={{ marginTop: '50px', borderTop: '1px solid #e2e8f0', paddingTop: '20px', textAlign: 'center' }}>
        <p style={{ fontSize: '10px', color: '#94a3b8' }}>AXION TECHNOLOGY - DOCUMENTO CONFIDENCIAL E PRIVADO</p>
      </div>
    </div>
  );
};
