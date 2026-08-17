ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS audit_exempt boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audit_exempt_reason text,
  ADD COLUMN IF NOT EXISTS audit_exempt_at timestamptz;