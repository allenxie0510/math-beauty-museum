const unavailable = () => {
  throw new Error(
    "Cloudflare bindings are unavailable in the Vercel runtime; configure Supabase environment variables.",
  );
};

export const env = new Proxy(
  {},
  { get: unavailable },
) as Record<string, never>;
