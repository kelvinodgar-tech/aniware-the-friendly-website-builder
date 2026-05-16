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
  MP4UPLOAD_USER: process.env.MP4UPLOAD_USER ?? "",
  MP4UPLOAD_PASS: process.env.MP4UPLOAD_PASS ?? "",
};
