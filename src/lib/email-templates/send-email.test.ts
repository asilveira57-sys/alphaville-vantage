import { afterEach, expect, it, vi } from 'vitest'

const { send } = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue(undefined) }))
vi.mock('@lovable.dev/email-js', () => ({
  sendLovableEmail: send,
  EmailAPIError: class extends Error {},
}))
vi.mock('@react-email/render', () => ({ render: vi.fn().mockResolvedValue('rendered') }))
vi.mock('./registry', () => ({
  TEMPLATES: { confirmation: { component: () => null, subject: 'Confirmação' } },
}))

import { sendTemplateEmail } from './send-email'

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })

it('uses the requested notify domain for managed app email', async () => {
  vi.stubEnv('LOVABLE_API_KEY', 'unit-test-key')
  await sendTemplateEmail('confirmation', 'recipient@example.test', { idempotencyKey: 'confirmation-event' })
  expect(send.mock.calls[0]?.[0]).toMatchObject({
    sender_domain: 'notify.portal.saimoveisalpha.com.br',
    from: { name: 'S.A Imóveis Alphaville', address: 'noreply@notify.portal.saimoveisalpha.com.br' },
    purpose: 'transactional',
    idempotency_key: 'confirmation-event',
  })
})