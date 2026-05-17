function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
export const env = {
  // The deployed Aniware app URL (e.g. https://project--<id>.lovable.app)
  APP_URL: need("APP_URL"),
  // Shared secret with the /api/public/worker/rpc endpoint
  WORKER_SECRET: need("WORKER_SECRET"),
  // Upload providers
  STREAMTAPE_LOGIN: process.env.STREAMTAPE_LOGIN ?? "",
  STREAMTAPE_KEY: process.env.STREAMTAPE_KEY ?? "",
  DOODSTREAM_API_KEY: process.env.DOODSTREAM_API_KEY ?? "",
};
