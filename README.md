# Supabase Content CMS

A portable, framework-free CMS for static websites. It provides an authenticated editor, drafts and publishing, blog and project content, media uploads, SEO fields, and public-site rendering using Supabase Auth, Postgres, Storage, and Row Level Security.

## What is included

- `admin/` — the browser-based CMS editor.
- `assets/js/cms-public.js` — optional rendering helpers for a public website.
- `assets/js/supabase-config.example.js` — safe configuration template.
- `supabase/schema.sql` — tables, grants, RLS policies, indexes, and the media bucket.
- `examples/integration.html` — minimal public-site integration.

## Requirements

- A Supabase project.
- A static website served over HTTP or HTTPS.
- One administrator account created in Supabase Auth.
- Node.js 18 or newer only for the package verification command.

## Install

1. Run `supabase/schema.sql` in the Supabase SQL Editor.
2. Create an email/password user under **Authentication → Users**.
3. Assign the administrator role, replacing the example email:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || '{"role":"admin"}'::jsonb
   where email = 'editor@example.com';
   ```

4. Sign out and back in after assigning the role so the new JWT includes `app_metadata.role`.
5. Edit `assets/js/supabase-config.js` and enter the project URL and publishable key from the Supabase **Connect** dialog. The `.example.js` copy is retained as a resettable template.
6. Copy `admin/` and `assets/js/` into the root of your static website.
7. In **Authentication → URL Configuration**, add your production `/admin/**` URL and any local development `/admin/**` URL.
8. Disable public sign-ups and enable leaked-password protection under Authentication settings.
9. Open `/admin/` and sign in.

The publishable key is designed for browser use. Never place a Supabase secret key or `service_role` key in this package or in frontend code.

## Public-site integration

Load Supabase, the configuration, and the renderer in this order:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.4/dist/umd/supabase.min.js"></script>
<script src="/assets/js/supabase-config.js"></script>
<script src="/assets/js/cms-public.js"></script>
```

The supplied renderer recognises these hooks:

- `[data-cms-blog]` and `[data-cms-blog-grid]` for recent posts.
- `[data-blog-index]` for the blog listing.
- `[data-blog-post]` for a single post.
- `[data-cms-projects]` and `[data-cms-project-grid]` for projects.

Use `/blog/<slug>/` routes or adapt `blogPostUrl()` in `cms-public.js` to your hosting setup. A sample is provided in `examples/integration.html`.

## Security model

- Anonymous visitors can read only published content whose publication time has arrived.
- Authenticated users must also have `app_metadata.role = admin` to manage content or media.
- Inserts and updates must retain the signed-in administrator as `author_id` or `updated_by`.
- The public media bucket permits public delivery, while authenticated admin policies control uploads and changes.
- The package uses a publishable browser key and never requires a secret or `service_role` key.

Supabase Security Advisor may report that `content_items` and `blog_brand_settings` are visible to anonymous clients. This is intentional: the public website needs Data API access to published articles and branding. RLS restricts `content_items` to published rows and prevents anonymous writes.

Disable public email sign-ups when the CMS is owner-managed. Review RLS policies before adding multiple editors or changing the role model.

## Verify the package

```bash
npm run verify
node --check admin/admin.js
node --check assets/js/cms-public.js
```

## Packaging notes

The included `assets/js/supabase-config.js` contains placeholders. A Supabase publishable key may be committed to a static site because RLS and explicit grants enforce access. Never place secret credentials in that file.
