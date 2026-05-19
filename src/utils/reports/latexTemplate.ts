/**
 * Axion LaTeX Report Templates
 * Corporate, Industrial, and Minimalist Aesthetics
 * 100% Native LaTeX - High-end Corporate Layout
 */

// ============================================================
// SHARED PREAMBLE & STYLES
// ============================================================
const LATEX_PREAMBLE = `
\\documentclass[10pt,a4paper]{article}

\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage{lmodern}
\\usepackage[top=2.2cm,bottom=2.2cm,left=2.5cm,right=2.5cm,headsep=1cm]{geometry}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage{booktabs}
\\usepackage{longtable}
\\usepackage{tabularx}
\\usepackage{array}
\\usepackage{lastpage}
\\usepackage{setspace}
\\usepackage{enumitem}
\\usepackage{microtype}
\\usepackage{parskip}
\\usepackage{calc}

% Border styles for tables
\\newcolumntype{Y}{>{\\raggedright\\arraybackslash}X}
\\newcolumntype{C}{>{\\centering\\arraybackslash}X}
\\newcolumntype{R}{>{\\raggedleft\\arraybackslash}X}

\\pagestyle{fancy}
\\fancyhf{}
\\renewcommand{\\headrulewidth}{0.5pt}
\\renewcommand{\\footrulewidth}{0.5pt}

% Header structure - Professional alignment
\\fancyhead[L]{\\small \\begin{tabular}{l} \\textbf{AXION TECHNOLOGY} \\\\ \\footnotesize Enterprise Operations Platform \\end{tabular}}
\\fancyhead[R]{\\small \\begin{tabular}{r} \\textbf{DOCUMENTO OFICIAL} \\\\ \\footnotesize {{GEN_DATETIME}} \\end{tabular}}

% Footer structure
\\fancyfoot[L]{\\footnotesize \\textit{Confidencialidade: Uso Interno Restrito}}
\\fancyfoot[C]{\\footnotesize Página \\thepage\\ de \\pageref{LastPage}}
\\fancyfoot[R]{\\footnotesize \\textbf{ID: {{REPORT_ID}}}}

% Hierarchy & Typography
\\titleformat{\\section}{\\large\\bfseries\\uppercase}{}{0em}{}[\\titlerule]
\\titleformat{\\subsection}{\\normalsize\\bfseries}{}{0em}{}
\\titlespacing{\\section}{0pt}{18pt}{10pt}
\\titlespacing{\\subsection}{0pt}{12pt}{6pt}

\\setstretch{1.15}
\\setlength{\\parindent}{0pt}
\\setlist[itemize]{noitemsep, topsep=2pt, leftmargin=1.5em}
`;

// ============================================================
// TEMPLATE: RELATÓRIO DE SAÚDE (APM/Health)
// ============================================================
export const LATEX_HEALTH_TEMPLATE = `
${LATEX_PREAMBLE}

\\begin{document}

% --- COVER ---
\\begin{titlepage}
    \\centering
    \\vspace*{4cm}
    {\\large \\scshape Axion Technology \\par}
    \\vspace{1.5cm}
    \\rule{\\linewidth}{1pt} \\\\[0.4cm]
    {\\huge \\textbf{Relatório de Saúde e Infraestrutura} \\par}
    \\rule{\\linewidth}{1pt} \\\\[1.5cm]
    {\\large \\scshape Auditoria de Performance do Sistema \\par}
    \\vfill
    \\begin{table}[h]
        \\centering
        \\renewcommand{\\arraystretch}{1.5}
        \\begin{tabular}{l | l}
            \\textbf{Período:} & {{PERIOD_RANGE}} \\\\
            \\textbf{Ambiente:} & {{ENVIRONMENT}} \\\\
            \\textbf{Emissor:} & {{GENERATED_BY}} \\\\
            \\textbf{Data:} & {{GEN_DATETIME}} \\\\
        \\end{tabular}
    \\end{table}
    \\vfill
    {\\footnotesize Axion Intelligence Engine v1.0}
\\end{titlepage}

\\newpage
\\tableofcontents
\\newpage

\\section{Resumo Executivo}
{{EXECUTIVE_SUMMARY}}

\\vspace{10pt}
\\begin{table}[h]
    \\centering
    \\renewcommand{\\arraystretch}{1.3}
    \\begin{tabularx}{0.8\\linewidth}{| Y | r |}
        \\hline
        \\textbf{Indicador de Saúde Geral} & \\textbf{Score: {{HEALTH_SCORE}}/100} \\\\
        \\hline
        \\textbf{Classificação de Risco} & \\textbf{{{RISK_LEVEL}}} \\\\
        \\hline
    \\end{tabularx}
\\end{table}

\\section{Telemetria e Métricas do Sistema}
{{SYSTEM_METRICS_CONTENT}}

\\section{Diagnóstico e Performance}
{{PERFORMANCE_CONTENT}}

\\section{Banco de Dados e Redes}
{{DB_INFRA_CONTENT}}

\\section{Eventos e Logs Críticos}
{{LOGS_CONTENT}}

\\section{Diagnóstico Técnico}
\\begin{itemize}
{{DIAGNOSIS_CONTENT}}
\\end{itemize}

\\section{Recomendações e Plano de Ação}
{{RECOMMENDATIONS_CONTENT}}

\\section{Parecer Técnico Final}
{{CONCLUSION_CONTENT}}

\\end{document}
`;

// ============================================================
// TEMPLATE: RELATÓRIO DE OPERAÇÃO (Tickets / Performance)
// ============================================================
export const LATEX_OPERATIONAL_TEMPLATE = `
${LATEX_PREAMBLE}

\\begin{document}

% --- COVER ---
\\begin{titlepage}
    \\centering
    \\vspace*{4cm}
    {\\large \\scshape Axion Technology \\par}
    \\vspace{1.5cm}
    \\rule{\\linewidth}{1pt} \\\\[0.4cm]
    {\\huge \\textbf{Relatório de Operação} \\par}
    \\rule{\\linewidth}{1pt} \\\\[1.5cm]
    {\\large \\scshape Desempenho e Eficiência Industrial \\par}
    \\vfill
    \\begin{table}[h]
        \\centering
        \\renewcommand{\\arraystretch}{1.5}
        \\begin{tabular}{l | l}
            \\textbf{Período Analisado:} & {{PERIOD_RANGE}} \\\\
            \\textbf{Ambiente:} & {{ENVIRONMENT}} \\\\
            \\textbf{Gerado por:} & {{GENERATED_BY}} \\\\
            \\textbf{ID de Auditoria:} & {{REPORT_ID}} \\\\
        \\end{tabular}
    \\end{table}
    \\vfill
    {\\footnotesize \\textit{Este documento possui validade institucional e técnica.}}
\\end{titlepage}

\\newpage
\\tableofcontents
\\newpage

\\section{Resumo Operacional}

O presente documento consolida os dados operacionais referentes ao período de {{PERIOD_RANGE}}. A análise foca em indicadores de produtividade, tempos de resposta e eficiência técnica das equipes de manutenção.

\\vspace{10pt}
\\begin{table}[h]
    \\centering
    \\renewcommand{\\arraystretch}{1.3}
    \\begin{tabularx}{\\linewidth}{| Y | r |}
        \\hline
        \\textbf{Métrica} & \\textbf{Valor Consolidade} \\\\
        \\hline
        Total de Chamados & {{TOTAL_TICKETS}} \\\\
        \\hline
        Chamados Finalizados & {{FINISHED_TICKETS}} \\\\
        \\hline
        Taxa de Eficiência & {{EFFICIENCY}}\\% \\\\
        \\hline
        SLA Compliance ($\\leq 30$ min) & {{SLA_PERCENT}}\\% \\\\
        \\hline
    \\end{tabularx}
\\end{table}

\\section{Indicadores Chave de Desempenho (KPIs)}

\\begin{table}[h]
    \\centering
    \\renewcommand{\\arraystretch}{1.3}
    \\begin{tabularx}{\\linewidth}{| Y | r |}
        \\hline
        \\textbf{Indicador} & \\textbf{Média do Período} \\\\
        \\hline
        Tempo Médio de Reparo (MTTR) & {{MTTR_AVG}} min \\\\
        \\hline
        Tempo de Primeira Resposta (FRT) & {{FRT_AVG}} min \\\\
        \\hline
        Backlog Operacional ($> 60$ min) & {{BACKLOG_COUNT}} \\\\
        \\hline
        Melhor Turno Operacional & {{BEST_SHIFT}} \\\\
        \\hline
    \\end{tabularx}
\\end{table}

\\section{Análise por Categoria de Ocorrência}
\\begin{longtable}{| p{8cm} | r | r |}
    \\hline
    \\textbf{Categoria} & \\textbf{Chamados} & \\textbf{Percentual} \\\\
    \\hline
    \\endhead
{{CATEGORY_ROWS}}
    \\hline
\\end{longtable}

\\section{Equipamentos (AGVs) - Performance e Disponibilidade}
\\begin{longtable}{| p{3cm} | r | r | r |}
    \\hline
    \\textbf{AGV} & \\textbf{Chamados} & \\textbf{MTBF (h)} & \\textbf{OEE (\\%)} \\\\
    \\hline
    \\endhead
{{AGV_ROWS}}
    \\hline
\\end{longtable}

\\section{Ranking de Produtividade Técnica}
\\begin{longtable}{| r | p{6cm} | r | r |}
    \\hline
    \\textbf{Pos.} & \\textbf{Técnico} & \\textbf{Chamados} & \\textbf{MTTR (min)} \\\\
    \\hline
    \\endhead
{{TECHNICIAN_ROWS}}
    \\hline
\\end{longtable}

\\section{Registro Cronológico (Resumo)}
\\begin{longtable}{| l | p{4cm} | l | l | l |}
    \\hline
    \\textbf{Protocolo} & \\textbf{Categoria} & \\textbf{Local} & \\textbf{AGV} & \\textbf{Status} \\\\
    \\hline
    \\endhead
{{HISTORY_ROWS}}
    \\hline
\\end{longtable}

\\section{Conclusão Técnica}
{{CONCLUSION_CONTENT}}

\\vspace{2cm}
\\begin{center}
    \\rule{6cm}{0.5pt} \\\\
    {\\small \\textbf{Axion Industrial Operations Platform} \\\\ Validação Automática via Engine}
\\end{center}

\\end{document}
`;

// ============================================================
// POPULATION FUNCTIONS
// ============================================================

export function sanitizeLatex(text: string): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/[&%$#_{}]/g, (m) => '\\' + m)
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
    .replace(/</g, '\\textless{}')
    .replace(/>/g, '\\textgreater{}')
    .replace(/\n/g, ' \\\\ '); // Convert newlines to LaTeX line breaks safely
}

export function populateTemplate(data: any): string {
  let tex = data._templateType === 'operational' ? LATEX_OPERATIONAL_TEMPLATE : LATEX_HEALTH_TEMPLATE;
  
  const replacements: Record<string, string> = {};
  for (const key in data) {
    if (key === '_templateType') continue;
    // We trust the data passed from the route. 
    // Data should be sanitized there before adding any LaTeX markup.
    replacements[key.toUpperCase()] = String(data[key] ?? '');
  }

  // Common fields
  replacements['ENVIRONMENT'] = process.env.NODE_ENV === 'production' ? 'PRODUÇÃO' : 'DESENVOLVIMENTO';
  if (!replacements['GEN_DATETIME']) replacements['GEN_DATETIME'] = new Date().toLocaleString('pt-BR');

  for (const key in replacements) {
    tex = tex.replace(new RegExp(`{{${key}}}`, 'g'), replacements[key]);
  }

  return tex;
}

export function populateHealthTemplate(data: any): string {
  return populateTemplate({ ...data, _templateType: 'health' });
}

export function populateOperationalTemplate(data: any): string {
  return populateTemplate({ ...data, _templateType: 'operational' });
}
