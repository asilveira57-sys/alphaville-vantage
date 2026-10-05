CREATE TABLE public.cities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, slug text NOT NULL UNIQUE, uf text NOT NULL,
  sort_priority integer NOT NULL DEFAULT 100, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.cities TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cities TO authenticated;
GRANT ALL ON public.cities TO service_role;
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cities public read" ON public.cities FOR SELECT USING (true);
CREATE POLICY "cities admin write" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE public.city_review_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE,
  raw_city text, source_url text, reason text NOT NULL,
  resolved_at timestamptz, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.city_review_queue TO authenticated;
GRANT ALL ON public.city_review_queue TO service_role;
ALTER TABLE public.city_review_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "city review admin" ON public.city_review_queue FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

INSERT INTO public.cities(name,slug,uf,sort_priority) VALUES
('Barueri','barueri','SP',1),('Santana de Parnaíba','santana-de-parnaiba','SP',2),
('Cajamar','cajamar','SP',100),('Jandira','jandira','SP',100),('Osasco','osasco','SP',100),('Carapicuíba','carapicuiba','SP',100),
('Itapevi','itapevi','SP',100),('Cotia','cotia','SP',100),('Araçariguama','aracariguama','SP',100),('São Paulo','sao-paulo','SP',100),
('São Roque','sao-roque','SP',100),('Sorocaba','sorocaba','SP',100),('Itu','itu','SP',100),('Porto Feliz','porto-feliz','SP',100),
('Paranapanema','paranapanema','SP',100),('Vargem Grande Paulista','vargem-grande-paulista','SP',100),('Angra dos Reis','angra-dos-reis','RJ',100);

CREATE POLICY "paused properties public read" ON public.properties FOR SELECT USING (status = 'paused');