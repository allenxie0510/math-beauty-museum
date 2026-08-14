# Supabase deployment

The Supabase deployment is an additional Vercel target. The existing Sites
deployment continues to use D1 and R2.

## First-time setup

1. Create the Supabase project in Singapore.
2. Open **SQL Editor**, paste and run
   `migrations/202608140001_hometown_math.sql`.
3. Confirm that the five `hometown_*` tables exist in **Table Editor**.
4. Confirm that **Storage** contains a private `hometown-media` bucket.

Do not commit or paste database passwords, access tokens, JWT signing secrets,
or the Supabase `service_role` key. Hosted secrets belong in Vercel project
environment variables.
