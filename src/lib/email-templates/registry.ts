import type { ComponentType } from 'react'
import { BRAND_TEMPLATES, BrandEmail } from './brand-email'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/** Template registry — all site emails share the S.A brand layout. */
export const TEMPLATES: Record<string, TemplateEntry> = {
  ...BRAND_TEMPLATES,
  // Alerta interno da sincronização com a Univen (falha, trava ou muitas desativações).
  'alerta-sincronizacao': {
    component: BrandEmail,
    subject: (d: Record<string, any>) => d.subject || 'Alerta da sincronização Univen',
    displayName: 'Alerta da sincronização',
    to: 'contato@saimoveisalpha.com.br',
    previewData: { subject: 'Sincronização incompleta', heading: 'Sincronização incompleta', intro: 'A API devolveu 2.100 imóveis (92% da última execução completa). Nada foi desativado.' },
  },
}
