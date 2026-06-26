
-- 1) Move data from blog_posts → editorial_pages (avoid slug collisions)
INSERT INTO public.editorial_pages (
  slug, title, excerpt, content_type, status,
  html_content, featured_image, tags,
  meta_title, meta_description,
  author_id, published_at, created_at, updated_at
)
SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM public.editorial_pages ep WHERE ep.slug = bp.slug)
      THEN bp.slug || '-' || substr(bp.id::text, 1, 8)
    ELSE bp.slug
  END,
  bp.title,
  bp.excerpt,
  'blog',
  bp.status,
  -- Markdown → HTML simples (H2/H3, parágrafos, quebras)
  CASE
    WHEN bp.content_markdown IS NULL OR bp.content_markdown = '' THEN ''
    ELSE
      '<div>' ||
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(bp.content_markdown, '^### (.+)$', '<h3>\1</h3>', 'gm'),
            '^## (.+)$', '<h2>\1</h2>', 'gm'
          ),
          '^# (.+)$', '<h1>\1</h1>', 'gm'
        ),
        E'\n\n+', '</p><p>', 'g'
      ) || '</div>'
  END,
  bp.cover_image_url,
  COALESCE(bp.tags, '{}'::text[]),
  bp.meta_title,
  bp.meta_description,
  bp.author_id,
  bp.published_at,
  bp.created_at,
  bp.updated_at
FROM public.blog_posts bp
WHERE NOT EXISTS (
  -- Skip if there is already an editorial_pages row that originated from this post
  SELECT 1 FROM public.editorial_pages ep2
  WHERE ep2.slug = bp.slug AND ep2.content_type = 'blog'
);

-- 2) Repoint content_generation_jobs to editorial_pages
ALTER TABLE public.content_generation_jobs
  ADD COLUMN IF NOT EXISTS editorial_page_id uuid REFERENCES public.editorial_pages(id) ON DELETE SET NULL;

UPDATE public.content_generation_jobs j
SET editorial_page_id = ep.id
FROM public.blog_posts bp
JOIN public.editorial_pages ep
  ON ep.content_type = 'blog'
 AND (ep.slug = bp.slug OR ep.slug = bp.slug || '-' || substr(bp.id::text, 1, 8))
WHERE j.blog_post_id = bp.id;

ALTER TABLE public.content_generation_jobs DROP COLUMN IF EXISTS blog_post_id;

-- 3) Drop blog_posts table
DROP TABLE IF EXISTS public.blog_posts CASCADE;
