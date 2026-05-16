function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
export const env = {
  SUPABASE_URL: need("SUPABASE_URL"),
  SUPABASE_SERVICE_ROLE_KEY: need("SUPABASE_SERVICE_ROLE_KEY"),
  STREAMTAPE_LOGIN: process.env.STREAMTAPE_LOGIN ?? "",
  STREAMTAPE_KEY: process.env.STREAMTAPE_KEY ?? "",
  DOODSTREAM_API_KEY: process.env.DOODSTREAM_API_KEY ?? "",
};
