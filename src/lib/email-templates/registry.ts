import type { ComponentType } from 'react'
import { BRAND_TEMPLATES } from './brand-email'

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
}
