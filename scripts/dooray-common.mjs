import fs from 'node:fs';
import os from 'node:os';

export const DEFAULT_CONFIG = '~/.config/dooray/config.json';

export function expandHome(p) { return String(p || '').replace(/^~(?=$|\/)/, os.homedir()); }
export function readJson(file) { return JSON.parse(fs.readFileSync(expandHome(file), 'utf8')); }
export function loadConfig(configPath = process.env.DOORAY_CONFIG || DEFAULT_CONFIG) {
  const file = expandHome(configPath);
  if (!fs.existsSync(file)) throw new Error(`Missing Dooray config: ${file}`);
  return { configPath: file, config: readJson(file) };
}
async function loadKeytar() {
  try {
    return await import('keytar');
  } catch (error) {
    throw new Error(`macOS Keychain token lookup requires the optional keytar package. Run npm install in the dooray-api skill directory, or set DOORAY_API_TOKEN/DOORAY_API_TOKEN_FILE. (${error.message})`);
  }
}
export async function readKeychainToken(config) {
  const service = config.tokenKeychainService || 'dooray-api-token';
  const account = config.tokenKeychainAccount || 'default';
  const keytar = await loadKeytar();
  const token = await keytar.getPassword(service, account);
  if (!token || !token.trim()) throw new Error(`empty Keychain token for service=${service}, account=${account}`);
  return token.trim();
}
export async function storeKeychainToken(config, token) {
  const value = String(token || '').trim();
  if (!value) throw new Error('Token is empty; aborting.');
  const service = config.tokenKeychainService || 'dooray-api-token';
  const account = config.tokenKeychainAccount || 'default';
  const keytar = await loadKeytar();
  await keytar.setPassword(service, account, value);
  return { service, account };
}
export async function readTokenWithSource(config) {
  const envToken = process.env.DOORAY_API_TOKEN || process.env.DOORAY_TOKEN;
  if (envToken && envToken.trim()) return { token: envToken.trim(), source: 'env' };
  const filePath = process.env.DOORAY_API_TOKEN_FILE || config.tokenFile;
  if (filePath) {
    const token = fs.readFileSync(expandHome(filePath), 'utf8').trim();
    if (token) return { token, source: 'file' };
  }
  try {
    return { token: await readKeychainToken(config), source: 'keychain' };
  } catch (error) {
    const service = config.tokenKeychainService || 'dooray-api-token';
    const account = config.tokenKeychainAccount || 'default';
    throw new Error(`Dooray token not available. Set DOORAY_API_TOKEN/DOORAY_API_TOKEN_FILE, or install keytar and store it in macOS Keychain with setup-keychain-token.mjs: service=${service}, account=${account}. (${error.message})`);
  }
}
export async function readToken(config) {
  return (await readTokenWithSource(config)).token;
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
export function assertNonDelete(method, pathOrUrl = '') {
  const m = String(method || '').toUpperCase();
  const p = String(pathOrUrl || '');
  if (m === 'DELETE' || /\b(delete|remove|trash|purge)\b/i.test(p)) {
    throw new Error('Dooray deletion is strictly forbidden by skill policy. Refusing to execute delete/remove/trash/purge operation.');
  }
}
export function unwrap(response) { return response?.result ?? response; }
export function pageLimit(n, fallback = 20) { return Math.max(1, Math.min(Number(n || fallback) || fallback, 100)); }
