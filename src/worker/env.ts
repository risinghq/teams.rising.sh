export type SessionUser = {
  id: string;
  email: string;
  name: string;
  username: string | null;
  avatar_url: string | null;
  whatsapp_number: string | null;
  whatsapp_verified_at: string | null;
  is_admin: number;
};

export type Env = {
  Bindings: {
    DB: D1Database;
    ASSETS: Fetcher;
    FILES: R2Bucket;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
    GITHUB_WEBHOOK_SECRET?: string;
    ALLOWED_DOMAINS?: string;
    ALLOWED_EMAILS?: string;
    // Lets a test or a local run sign in without Google. Never set in production.
    DEV_LOGIN?: string;
  };
  Variables: { user: SessionUser };
};
