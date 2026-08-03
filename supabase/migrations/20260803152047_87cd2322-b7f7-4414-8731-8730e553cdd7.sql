ALTER TABLE public.editorial_pages DROP CONSTRAINT editorial_pages_content_type_check;
ALTER TABLE public.editorial_pages ADD CONSTRAINT editorial_pages_content_type_check
  CHECK (content_type = ANY (ARRAY['condominio','bairro','cidade','guia','blog','institucional','hub','empreendimento','parceiro']));