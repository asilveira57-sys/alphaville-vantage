
ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS lavabos INTEGER,
  ADD COLUMN IF NOT EXISTS parking_covered INTEGER,
  ADD COLUMN IF NOT EXISTS parking_uncovered INTEGER,
  ADD COLUMN IF NOT EXISTS audit_status TEXT,
  ADD COLUMN IF NOT EXISTS audit_issues JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_properties_audit_status ON public.properties(audit_status);
CREATE INDEX IF NOT EXISTS idx_properties_bedrooms ON public.properties(bedrooms);
CREATE INDEX IF NOT EXISTS idx_properties_bathrooms ON public.properties(bathrooms);
CREATE INDEX IF NOT EXISTS idx_properties_parking ON public.properties(parking);
