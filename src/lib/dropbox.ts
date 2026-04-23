// Dropbox upload helper (moved from TSUKURU). See original for rationale.
// Auth: long-lived refresh token traded on demand for a short-lived access token.
// App folder 型なので万一漏洩しても /Apps/<app>/ 配下しか触れない想定。

const CLIENT_ID = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_ID;
const CLIENT_SECRET = process.env.NEXT_PUBLIC_DROPBOX_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.NEXT_PUBLIC_DROPBOX_REFRESH_TOKEN;
const APP_FOLDER_ROOT = process.env.NEXT_PUBLIC_DROPBOX_FOLDER_ROOT ?? '';

export function isDropboxConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET && REFRESH_TOKEN);
}

type AccessTokenCache = { token: string; expiresAt: number };
let cached: AccessTokenCache | null = null;

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
    throw new Error(
      'Dropbox is not configured (set NEXT_PUBLIC_DROPBOX_CLIENT_ID / CLIENT_SECRET / REFRESH_TOKEN)',
    );
  }
  const now = Date.now();
  if (cached && cached.expiresAt > now + 60_000) return cached.token;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: REFRESH_TOKEN,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  });
  const res = await fetch('https://api.dropbox.com/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    throw new Error(`Dropbox token refresh failed (${res.status}): ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expiresAt: now + data.expires_in * 1000 };
  return data.access_token;
}

function safeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_');
}

export async function uploadToDropbox(
  subdir: string,
  file: File,
): Promise<{ path: string; downloadUrl: string }> {
  const token = await getAccessToken();
  const base = APP_FOLDER_ROOT.replace(/\/+$/, '');
  const folder = `${base}/${subdir.replace(/^\/+|\/+$/g, '')}`.replace(/\/+/g, '/');
  const filename = `${Date.now()}_${safeFileName(file.name)}`;
  const path = `${folder}/${filename}`;

  const uploadRes = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
      'Dropbox-API-Arg': encodeApiArg({
        path,
        mode: 'add',
        autorename: true,
        mute: true,
      }),
    },
    body: file,
  });
  if (!uploadRes.ok) {
    throw new Error(`Dropbox upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }
  const uploaded = (await uploadRes.json()) as { path_lower: string };
  const uploadedPath = uploaded.path_lower ?? path;

  const downloadUrl = await ensureSharedLink(token, uploadedPath);
  return { path: uploadedPath, downloadUrl };
}

async function ensureSharedLink(token: string, path: string): Promise<string> {
  const createRes = await fetch(
    'https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path,
        settings: { requested_visibility: 'public' },
      }),
    },
  );
  if (createRes.ok) {
    const data = (await createRes.json()) as { url: string };
    return toDirectUrl(data.url);
  }

  const listRes = await fetch('https://api.dropboxapi.com/2/sharing/list_shared_links', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, direct_only: true }),
  });
  if (!listRes.ok) {
    throw new Error(`Dropbox list_shared_links failed (${listRes.status}): ${await listRes.text()}`);
  }
  const data = (await listRes.json()) as { links?: Array<{ url: string }> };
  const url = data.links?.[0]?.url;
  if (!url) throw new Error('Dropbox shared link not found after conflict');
  return toDirectUrl(url);
}

function toDirectUrl(sharedUrl: string): string {
  try {
    const u = new URL(sharedUrl);
    u.searchParams.set('dl', '1');
    u.hostname = u.hostname.replace('www.dropbox.com', 'dl.dropboxusercontent.com');
    return u.toString();
  } catch {
    return sharedUrl;
  }
}

function encodeApiArg(arg: unknown): string {
  const json = JSON.stringify(arg);
  return json.replace(/[\u007f-\uffff]/g, (ch) =>
    '\\u' + ('0000' + ch.charCodeAt(0).toString(16)).slice(-4),
  );
}
