# Security

## Reporting

Report security concerns privately to the repository owner. Do not publish credentials, access tokens, private customer content, or exploit details in a public issue.

## Deployment rules

- Use only a Supabase publishable key in browser code.
- Never commit a secret key, `service_role` key, database password, or administrator access token.
- Keep RLS enabled on every table exposed through the Data API.
- Preserve the explicit Postgres grants and policies in `supabase/schema.sql`.
- Disable public sign-ups unless your product intentionally supports them.
- Enable leaked-password protection in Supabase Auth.
- Use a configured SMTP provider before relying on production password recovery.
- Refresh the administrator session after changing `raw_app_meta_data` so JWT claims are current.
- Review Storage limits and allowed MIME types before enabling larger uploads.

## Supported setup

The package assumes a single-owner or tightly controlled administrator role. Define ownership and collaboration rules before granting access to additional editors.
