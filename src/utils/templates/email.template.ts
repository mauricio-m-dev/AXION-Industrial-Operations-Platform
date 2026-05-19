export interface UnifiedEmailField {
  label: string;
  value: string;
  isBadge?: boolean;
  badgeBg?: string;
  badgeColor?: string;
}

export interface UnifiedEmailHighlightBox {
  title: string;
  content: string;
  bg?: string;
  border?: string;
  color?: string;
}

export interface UnifiedEmailOptions {
  title: string;
  subtitle: string;
  subtitleColor?: string;
  description: string;
  fields: UnifiedEmailField[];
  highlightBox?: UnifiedEmailHighlightBox;
}

export function buildUnifiedEmailHtml(options: UnifiedEmailOptions): string {
  const fieldsHtml = options.fields.map(field => {
    let valueHtml = '';
    if (field.isBadge) {
      valueHtml = `<span style="background: ${field.badgeBg || '#e2e8f0'}; color: ${field.badgeColor || '#18181b'}; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">${field.value}</span>`;
    } else {
      valueHtml = `<span style="color: #334155; font-weight: 600;">${field.value}</span>`;
    }
    return `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #64748b; font-size: 11px; width: 180px; text-transform: uppercase; letter-spacing: 0.05em;">${field.label}</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155;">${valueHtml}</td>
      </tr>
    `;
  }).join('');

  let highlightHtml = '';
  if (options.highlightBox) {
    highlightHtml = `
      <div style="margin-top: 24px; padding: 20px; background: ${options.highlightBox.bg || '#f8fafc'}; border: 1px solid ${options.highlightBox.border || '#e2e8f0'}; border-radius: 12px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);">
        <h4 style="margin: 0 0 8px 0; color: ${options.highlightBox.color || '#09090b'}; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em;">
          ${options.highlightBox.title}
        </h4>
        <p style="margin: 0; white-space: pre-wrap; font-size: 13px; line-height: 1.6; color: #334155;">${options.highlightBox.content}</p>
      </div>
    `;
  }

  return `
    <div style="background-color: #f8fafc; padding: 40px 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; min-height: 100%;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.03), 0 8px 10px -6px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <table cellpadding="0" cellspacing="0" border="0" width="100%">
          <tr>
            <td align="center" bgcolor="#09090b" style="background-color: #09090b; padding: 32px 24px; text-align: center; border-bottom: 4px solid #DC2626;">
              <div style="margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #ffffff !important;">
                <font color="#ffffff">${options.title}</font>
              </div>
              <div style="margin: 6px 0 0 0; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.15em; color: #94a3b8 !important;">
                <font color="#94a3b8">INDUSTRIAL OPERATIONS PLATFORM</font>
              </div>
            </td>
          </tr>
        </table>
        
        <!-- Content -->
        <div style="padding: 32px 24px;">
          <h3 style="color: ${options.subtitleColor || '#DC2626'}; margin-top: 0; margin-bottom: 12px; font-size: 18px; font-weight: 800; letter-spacing: -0.02em;">${options.subtitle}</h3>
          <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-top: 0; margin-bottom: 24px;">${options.description}</p>
          
          <!-- Table -->
          <table style="text-align: left; border-collapse: collapse; width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th colspan="2" style="padding: 10px 16px; font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0;">Ficha de Ocorrência</th>
              </tr>
            </thead>
            <tbody>
              ${fieldsHtml}
            </tbody>
          </table>
          
          ${highlightHtml}
          
          <div style="margin-top: 32px; text-align: center;">
            <a href="https://axiontechnology.com/admin" style="display: inline-block; background-color: #DC2626; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-size: 12px; font-weight: 700; text-decoration: none; text-transform: uppercase; letter-spacing: 0.08em; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Acessar Painel Axion</a>
          </div>
          
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 30px 0;"/>
          
          <p style="color: #94a3b8; font-size: 11px; text-align: center; line-height: 1.5; margin: 0;">
            Este é um e-mail automático gerado pelo sistema integrado AXION.<br/>
            &copy; ${new Date().getFullYear()} Axion Technology. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </div>
  `;
}
