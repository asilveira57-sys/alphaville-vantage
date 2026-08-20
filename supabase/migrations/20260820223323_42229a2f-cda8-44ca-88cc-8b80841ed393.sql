CREATE TABLE public.financing_banks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  annual_rate numeric NOT NULL DEFAULT 11.2,
  min_down_payment_pct numeric NOT NULL DEFAULT 20,
  max_financing_pct numeric NOT NULL DEFAULT 80,
  min_term_months integer NOT NULL DEFAULT 60,
  max_term_months integer NOT NULL DEFAULT 420,
  allows_price boolean NOT NULL DEFAULT true,
  allows_sac boolean NOT NULL DEFAULT true,
  accepts_fgts boolean NOT NULL DEFAULT true,
  notes text,
  site_url text,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.financing_banks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financing_banks TO authenticated;
GRANT ALL ON public.financing_banks TO service_role;

ALTER TABLE public.financing_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "financing_banks public read active" ON public.financing_banks
  FOR SELECT USING (active = true);
CREATE POLICY "financing_banks admin manage" ON public.financing_banks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'editor'));

CREATE TRIGGER financing_banks_updated_at BEFORE UPDATE ON public.financing_banks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.financing_simulations
  ADD COLUMN IF NOT EXISTS bank_id uuid REFERENCES public.financing_banks(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bank_name text;

INSERT INTO public.financing_banks (name, slug, annual_rate, min_down_payment_pct, max_financing_pct, min_term_months, max_term_months, allows_price, allows_sac, accepts_fgts, display_order, notes) VALUES
  ('Caixa Econômica Federal', 'caixa', 10.99, 20, 80, 60, 420, true, true, true, 1, 'Linhas SBPE e FGTS. Taxa média divulgada; condição final depende da análise de crédito.'),
  ('Itaú', 'itau', 11.29, 20, 80, 60, 360, true, true, true, 2, 'Taxa média SBPE.'),
  ('Bradesco', 'bradesco', 11.49, 20, 80, 60, 360, true, true, true, 3, 'Taxa média SBPE.'),
  ('Santander', 'santander', 11.59, 20, 80, 60, 420, true, true, true, 4, 'Taxa média SBPE.'),
  ('Banco do Brasil', 'banco-do-brasil', 11.19, 20, 80, 60, 420, true, true, true, 5, 'Taxa média SBPE.');