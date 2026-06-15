import fs from 'node:fs';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

export const DEFAULT_CONFIG = '~/.config/dooray/config.json';
const execFileAsync = promisify(execFile);

export function expandHome(p) { return String(p || '').replace(/^~(?=$|\/)/, os.homedir()); }
export function readJson(file) {
  const text = fs.readFileSync(expandHome(file), 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(text);
}
export function loadConfig(configPath = process.env.DOORAY_CONFIG || DEFAULT_CONFIG) {
  const file = expandHome(configPath);
  try {
    return { configPath: file, config: readJson(file) };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`Missing Dooray config: ${file}. Create it or set DOORAY_CONFIG to a readable config file.`);
    }
    if (error?.code === 'EACCES' || error?.code === 'EPERM') {
      throw new Error(`Cannot access Dooray config: ${file}. Check file permissions or sandbox access. (${error.code}: ${error.message})`);
    }
    if (error?.code === 'ENOTDIR') {
      throw new Error(`Invalid Dooray config path: ${file}. One path component is not a directory. (${error.message})`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid Dooray config JSON: ${file}. (${error.message})`);
    }
    throw error;
  }
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
    const mod = await import('keytar');
    const keytar = mod.default || mod;
    if (!keytar?.getPassword || !keytar?.setPassword) {
      throw new Error('keytar module does not expose getPassword/setPassword');
    }
    return keytar;
  } catch (error) {
    throw new Error(`OS credential-store token lookup requires the optional keytar package. Run npm install in the dooray-api skill directory, use pnpm install + pnpm approve-builds --all + pnpm rebuild keytar when npm is unavailable, or set DOORAY_API_TOKEN/DOORAY_API_TOKEN_FILE. (${error.message})`);
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
export async function readMacOSSecurityToken(config) {
  if (process.platform !== 'darwin') throw new Error('macOS security CLI is available only on macOS');
  const { service, account } = credentialTarget(config);
  const timeoutMs = Math.max(1000, Number(process.env.DOORAY_SECURITY_TIMEOUT_MS || config.securityLookupTimeoutMs || 5000) || 5000);
  const { stdout } = await execFileAsync('/usr/bin/security', ['find-generic-password', '-s', service, '-a', account, '-w'], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024,
    timeout: timeoutMs,
  });
  const token = String(stdout || '').trim();
  if (!token) throw new Error(`empty macOS Keychain token for service=${service}, account=${account}`);
  return token;
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
  const provider = String(process.env.DOORAY_API_TOKEN_PROVIDER || config.tokenProvider || config.credentialProvider || 'auto').toLowerCase();
  const credentialErrors = [];
  if ((provider === 'auto' || provider === 'mac-security' || provider === 'macos-security' || provider === 'security') && process.platform === 'darwin') {
    try {
      return { token: await readMacOSSecurityToken(config), source: 'macos-keychain-security' };
    } catch (error) {
      credentialErrors.push(`macOS security CLI: ${error.message}`);
      if (provider !== 'auto') {
        const { service, account } = credentialTarget(config);
        throw new Error(`Dooray token not available from macOS security CLI: service=${service}, account=${account}. (${error.message})`);
      }
    }
  }
  if (provider !== 'auto' && provider !== 'keytar' && provider !== 'credential-store') {
    throw new Error(`Unsupported Dooray tokenProvider: ${provider}`);
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
    credentialErrors.push(`keytar credential store: ${error.message}`);
    const { service, account } = credentialTarget(config);
    throw new Error(`Dooray token not available. Set DOORAY_API_TOKEN/DOORAY_API_TOKEN_FILE, use macOS Keychain security CLI, or install keytar and store it in the OS credential store with setup-token.mjs: service=${service}, account=${account}. (${credentialErrors.join(' | ')})`);
  }
}
export async function readToken(config) {
  return (await readTokenWithSource(config)).token;
}
export function requestTimeoutMs(config) {
  return Math.max(1000, Number(process.env.DOORAY_API_TIMEOUT_MS || config.requestTimeoutMs || 15000) || 15000);
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
