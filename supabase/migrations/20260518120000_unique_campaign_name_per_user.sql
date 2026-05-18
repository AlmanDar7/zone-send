-- Ensure one workflow/sequence name per user (case-insensitive, trimmed)
WITH ranked AS (
  SELECT
    id,
    name,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, lower(trim(name))
      ORDER BY created_at ASC
    ) AS rn
  FROM public.campaigns
)
UPDATE public.campaigns AS c
SET name = c.name || ' (' || ranked.rn::text || ')'
FROM ranked
WHERE c.id = ranked.id
  AND ranked.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS campaigns_user_name_unique
  ON public.campaigns (user_id, lower(trim(name)));
