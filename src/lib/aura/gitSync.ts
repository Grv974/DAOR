// Optional GitHub sync (level 1 of the spec's backend tiers): commit a JSON
// snapshot into a GitHub repository via the Contents API using a personal
// access token. 100 % browser-side — the token never leaves the user's device
// except in the authenticated request to api.github.com.

const STORAGE = 'daor:gitSync';

export interface GitConfig {
  repo: string; // "owner/repo"
  path: string; // e.g. "daor-backup.json"
  token: string; // GitHub PAT
}

export function loadGitConfig(): GitConfig {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) return JSON.parse(raw) as GitConfig;
  } catch {
    /* ignore */
  }
  return { repo: '', path: 'daor-backup.json', token: '' };
}

export function saveGitConfig(config: GitConfig) {
  try {
    localStorage.setItem(STORAGE, JSON.stringify(config));
  } catch {
    /* ignore */
  }
}

function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/** Create or update the backup file in the repo. Returns the commit URL. */
export async function pushToGitHub(config: GitConfig, content: string): Promise<string> {
  if (!config.repo || !config.token) throw new Error('Dépôt et token requis.');
  const base = `https://api.github.com/repos/${config.repo}/contents/${config.path}`;
  const headers = {
    Authorization: `Bearer ${config.token}`,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
  };

  // Look up the existing file's sha (required to update it).
  let sha: string | undefined;
  const head = await fetch(base, { headers });
  if (head.status === 200) {
    const json = (await head.json()) as { sha?: string };
    sha = json.sha;
  } else if (head.status !== 404) {
    throw new Error(`GitHub: ${head.status} ${await head.text()}`);
  }

  const res = await fetch(base, {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      message: `DAOR backup ${new Date().toISOString()}`,
      content: utf8ToBase64(content),
      sha,
    }),
  });
  if (!res.ok) throw new Error(`GitHub: ${res.status} ${await res.text()}`);
  const out = (await res.json()) as { commit?: { html_url?: string } };
  return out.commit?.html_url ?? 'Sauvegarde envoyée.';
}
