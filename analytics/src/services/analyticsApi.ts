// Client for the Cloudflare Analytics Engine SQL API, proxied through the
// Vite dev server (see vite.config.ts) so the API token never reaches the
// browser. See backend/ANALYTICS.md for the dataset schema and auth setup.

interface SqlResponse<T> {
  meta: { name: string; type: string }[];
  data: T[];
  rows: number;
}

export async function runQuery<T>(sql: string): Promise<T[]> {
  const res = await fetch('/cf-sql', {
    method: 'POST',
    body: `${sql}\nFORMAT JSON`,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare SQL API ${res.status}: ${text.slice(0, 300)}`);
  }

  const json = (await res.json()) as SqlResponse<T>;
  return json.data;
}
