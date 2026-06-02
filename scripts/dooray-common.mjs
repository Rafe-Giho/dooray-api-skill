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
export function configDefault(config, keys, fallback = null) {
  for (const key of Array.isArray(keys) ? keys : [keys]) {
    let value = config;
    for (const part of String(key).split('.')) value = value?.[part];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return fallback;
}
export function asArray(value) {
  if (value === undefined || value === null || value === '') return [];
  return Array.isArray(value) ? value.filter(v => v !== undefined && v !== null && v !== '') : [value];
}
export function webBaseUrl(config) {
  const raw = configDefault(config, ['webBaseUrl', 'tenantBaseUrl', 'doorayWebBaseUrl', 'tenantUrl'], null);
  if (!raw) return null;
  const url = new URL(raw);
  if (url.protocol !== 'https:') throw new Error(`Dooray webBaseUrl must use https: ${url.origin}`);
  return url.toString().replace(/\/$/, '');
}
export function doorayWebUrl(config, path) {
  const base = webBaseUrl(config);
  if (!base) return null;
  return new URL(String(path || '/').replace(/^\/?/, '/'), `${base}/`).toString();
}
async function loadKeytar() {
  try {
    return await import('keytar');
  } catch (error) {
    throw new Error(`OS credential-store token lookup requires the optional keytar package. Run npm install in the dooray-api skill directory, or set DOORAY_API_TOKEN/DOORAY_API_TOKEN_FILE. (${error.message})`);
  }
}
export function credentialStoreName() {
  if (process.platform === 'darwin') return 'macOS Keychain';
  if (process.platform === 'win32') return 'Windows Credential Manager';
  return 'Secret Service/libsecret credential store';
}
export function credentialTarget(config) {
  return {
    service: config.tokenCredentialService || config.tokenKeychainService || 'dooray-api-token',
    account: config.tokenCredentialAccount || config.tokenKeychainAccount || 'default',
  };
}
export async function readCredentialToken(config) {
  const { service, account } = credentialTarget(config);
  const keytar = await loadKeytar();
  const token = await keytar.getPassword(service, account);
  if (!token || !token.trim()) throw new Error(`empty credential-store token for service=${service}, account=${account}`);
  return token.trim();
}
export async function storeCredentialToken(config, token) {
  const value = String(token || '').trim();
  if (!value) throw new Error('Token is empty; aborting.');
  const { service, account } = credentialTarget(config);
  const keytar = await loadKeytar();
  await keytar.setPassword(service, account, value);
  return { service, account, store: credentialStoreName() };
}
export const readKeychainToken = readCredentialToken;
export const storeKeychainToken = storeCredentialToken;
export async function readTokenWithSource(config) {
  const envToken = process.env.DOORAY_API_TOKEN || process.env.DOORAY_TOKEN;
  if (envToken && envToken.trim()) return { token: envToken.trim(), source: 'env' };
  const filePath = process.env.DOORAY_API_TOKEN_FILE || config.tokenFile;
  if (filePath) {
    const token = fs.readFileSync(expandHome(filePath), 'utf8').trim();
    if (token) return { token, source: 'file' };
  }
  try {
    const timeoutMs = Math.max(1000, Number(process.env.DOORAY_TOKEN_TIMEOUT_MS || config.tokenLookupTimeoutMs || 10000) || 10000);
    let timer;
    const token = await Promise.race([
      readCredentialToken(config).finally(() => clearTimeout(timer)),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(`credential-store token lookup timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
    return { token, source: 'credential-store' };
  } catch (error) {
    const { service, account } = credentialTarget(config);
    throw new Error(`Dooray token not available. Set DOORAY_API_TOKEN/DOORAY_API_TOKEN_FILE, or install keytar and store it in the OS credential store with setup-token.mjs: service=${service}, account=${account}. (${error.message})`);
  }
}
export async function readToken(config) {
  return (await readTokenWithSource(config)).token;
}
export function requestUrl(config, pathOrUrl) {
  const base = String(config.baseUrl || 'https://api.dooray.com').replace(/\/$/, '');
  if (/^https?:\/\//i.test(pathOrUrl)) {
    const target = new URL(pathOrUrl);
    const allowed = new URL(base);
    if (target.origin !== allowed.origin) {
      throw new Error(`Refusing to send Dooray API token to non-configured host: ${target.origin}`);
    }
    return target.toString();
  }
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
