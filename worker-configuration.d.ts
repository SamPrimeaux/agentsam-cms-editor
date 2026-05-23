interface Env {
  DB: D1Database;
  DASHBOARD: R2Bucket;
  ASSETS: Fetcher;
  OPENAI_API_KEY?: string;
  CLOUDFLARE_API_TOKEN?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
}
