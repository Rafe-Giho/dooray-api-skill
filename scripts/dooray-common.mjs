import fs from 'node:fs';
import os from 'node:os';
import { execFile as rawExecFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(rawExecFile);
export const DEFAULT_CONFIG = '~/.config/dooray/config.json';

export function expandHome(p) { return String(p || '').replace(/^~(?=$|\/)/, os.homedir()); }
export function readJson(file) { return JSON.parse(fs.readFileSync(expandHome(file), 'utf8')); }
export function loadConfig(configPath = process.env.DOORAY_CONFIG || DEFAULT_CONFIG) {
  const file = expandHome(configPath);
  if (!fs.existsSync(file)) throw new Error(`Missing Dooray config: ${file}`);
  return { configPath: file, config: readJson(file) };
}
export async function readToken(config) {
  const envToken = process.env.DOORAY_API_TOKEN || process.env.DOORAY_TOKEN;
  if (envToken && envToken.trim()) return envToken.trim();
  const filePath = process.env.DOORAY_API_TOKEN_FILE || config.tokenFile;
  if (filePath) {
    const token = fs.readFileSync(expandHome(filePath), 'utf8').trim();
    if (token) return token;
  }
  const service = config.tokenKeychainService || 'dooray-api-token';
  const account = config.tokenKeychainAccount || 'default';
  try {
    const { stdout } = await execFile('security', ['find-generic-password', '-a', account, '-s', service, '-w'], { timeout: 10000 });
    const token = stdout.trim();
    if (!token) throw new Error('empty token');
    return token;
  } catch (error) {
    throw new Error(`Dooray token not available. Set DOORAY_API_TOKEN/DOORAY_API_TOKEN_FILE, or on macOS store it in Keychain: service=${service}, account=${account}. Run setup-keychain-token.sh. (${error.message})`);
  }
}
export function requestUrl(config, pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = String(config.baseUrl || 'https://api.dooray.com').replace(/\/$/, '');
  const path = String(pathOrUrl || '').startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}
export function redact(value) {
  return JSON.parse(JSON.stringify(value, (key, val) => /token|authorization|password|secret|webhook/i.test(key) ? '***' : val));
}
export async function doorayRequest(config, method, pathOrUrl, body) {
  const token = await readToken(config);
  const headers = { Authorization: `dooray-api ${token}`, Accept: 'application/json' };
  if (body != null) headers['Content-Type'] = 'application/json';
  const res = await fetch(requestUrl(config, pathOrUrl), { method: method.toUpperCase(), headers, body });
  const text = await res.text();
  let parsed = text;
  try { parsed = JSON.parse(text); } catch {}
  if (!res.ok) {
    const error = new Error(`Dooray API ${method} ${pathOrUrl} failed: ${res.status} ${res.statusText}`);
    error.status = res.status;
    error.body = parsed;
    throw error;
  }
  return parsed;
}
export function unwrap(response) { return response?.result ?? response; }
export function pageLimit(n, fallback = 20) { return Math.max(1, Math.min(Number(n || fallback) || fallback, 100)); }
