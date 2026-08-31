# Supabase Content CMS

A ready-to-connect CMS for static websites. It includes a blog and project editor, media uploads, branding, SEO fields, drafts, and publishing.

## Quick setup

Ask your AI coding assistant to connect this package to your website, then complete these steps:

1. Create a Supabase project.
2. Open the Supabase **SQL Editor** and run [`supabase/schema.sql`](supabase/schema.sql). This creates the database, security rules, and media storage.
3. In Supabase, go to **Authentication → Users** and create the person who will manage the CMS.
4. Make that user an admin by running this in the SQL Editor (replace the email):

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
     || '{"role":"admin"}'::jsonb
   where email = 'you@example.com';
   ```

5. Copy your Supabase project URL and publishable key into [`assets/js/supabase-config.js`](assets/js/supabase-config.js).
6. Add the package files to your website and open `/admin/` to sign in.

That is the essential setup. The public website can use [`assets/js/cms-public.js`](assets/js/cms-public.js) to display published content; [`examples/integration.html`](examples/integration.html) shows the required script tags and page hooks.

## Important

Use only the Supabase **publishable key** in browser code—never use a secret or `service_role` key. For an owner-managed CMS, disable public sign-ups in Supabase after creating the admin.
