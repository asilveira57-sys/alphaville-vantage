# Project Architecture

- Dynamic CMS-created developments render through the shared full development template; this keeps future pages consistent with the MPD development experience.
- Development-specific CMS data lives in editorial_pages.development_details JSON; this keeps the development form structured without fragmenting content across tables.
- Property public SEO text is generated only from structured property facts plus the official condominium reached by condominium_id; this prevents raw scraped labels from leaking into public copy.- Portal and main-site listings are reconciled by source_id (numeric URL tail) in src/lib/reconciliation.server.ts, shared by the daily cron route and the Admin 'Rodar agora'; external_ref paths change when purpose/neighborhood change.
- Leads CRM: all form tables feed public.leads through AFTER INSERT/UPDATE triggers (upsert_lead); forms stay unchanged and new forms only need a trigger.
