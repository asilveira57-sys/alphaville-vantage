-- Vídeos do YouTube nas páginas do portal (24/11/2026)
-- Rodar no editor SQL do Cloud do Lovable.
--
-- editorial_pages.video (blog, guias): {url, title, description, upload_date, duration, chapters}
--   → player no topo + VideoObject no head. Preenchido pelo CMS (seção "Vídeo do YouTube").
-- streets.video (páginas /ruas):
--   • com "href": só um card com link para a página principal do vídeo (sem player);
--   • sem "href": player + VideoObject na própria página da rua (quando não existe guia).
-- Regra: um vídeo, uma página principal.

alter table public.editorial_pages add column if not exists video jsonb;
alter table public.streets add column if not exists video jsonb;

comment on column public.editorial_pages.video is 'Vídeo do YouTube da página: {url,title,description,upload_date,duration,chapters}';
comment on column public.streets.video is 'Vídeo do YouTube da rua: com href = card apontando para a página principal; sem href = player';
