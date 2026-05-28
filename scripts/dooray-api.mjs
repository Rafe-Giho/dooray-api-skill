#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFile as rawExecFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(rawExecFile);
const DEFAULT_CONFIG = '~/.config/dooray/config.json';

function expandHome(p) { return String(p || '').replace(/^~(?=$|\/)/, os.homedir()); }
function readJson(file) { return JSON.parse(fs.readFileSync(expandHome(file), 'utf8')); }
function usage() {
  console.log(`Usage:
  node dooray-api.mjs config [--config ~/.config/dooray/config.json]
  node dooray-api.mjs request <METHOD> <PATH_OR_URL> [--data JSON_OR_@file] [--config FILE]

Examples:
  node dooray-api.mjs config
  node dooray-api.mjs request GET /common/v1/members/me
  node dooray-api.mjs request POST /some/path --data @payload.json`);
}
function parseArgs(argv) {
  const args = { command: argv[2], rest: [], config: process.env.DOORAY_CONFIG || DEFAULT_CONFIG, data: null };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') args.config = argv[++i];
    else if (a === '--data') args.data = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else args.rest.push(a);
  }
  return args;
}
async function readToken(config) {
  const service = config.tokenKeychainService || 'dooray-api-token';
  const account = config.tokenKeychainAccount || 'default';
  try {
    const { stdout } = await execFile('security', ['find-generic-password', '-a', account, '-s', service, '-w'], { timeout: 10000 });
    const token = stdout.trim();
    if (!token) throw new Error('empty token');
    return token;
  } catch (error) {
    throw new Error(`Dooray token not available in Keychain: service=${service}, account=${account}. Run setup-keychain-token.sh. (${error.message})`);
  }
}
function payloadOf(value) {
  if (value == null) return undefined;
  if (value.startsWith('@')) return fs.readFileSync(expandHome(value.slice(1)), 'utf8');
  return value;
}
function requestUrl(config, pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base = String(config.baseUrl || 'https://api.dooray.com').replace(/\/$/, '');
  const path = String(pathOrUrl || '').startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}
function redact(value) {
  return JSON.parse(JSON.stringify(value, (key, val) => /token|authorization|password|secret|webhook/i.test(key) ? '***' : val));
}

const args = parseArgs(process.argv);
if (args.help || !args.command) { usage(); process.exit(args.help ? 0 : 2); }
const configPath = expandHome(args.config);
if (!fs.existsSync(configPath)) {
  console.error(`Missing Dooray config: ${configPath}`);
  process.exit(2);
}
const config = readJson(configPath);

if (args.command === 'config') {
  let tokenAvailable = false;
  try { await readToken(config); tokenAvailable = true; } catch {}
  console.log(JSON.stringify({
    configPath,
    config: redact(config),
    tokenAvailable,
  }, null, 2));
  process.exit(0);
}

if (args.command === 'request') {
  const [methodRaw, pathOrUrl] = args.rest;
  if (!methodRaw || !pathOrUrl) { usage(); process.exit(2); }
  const method = methodRaw.toUpperCase();
  const token = await readToken(config);
  const body = payloadOf(args.data);
  const headers = {
    Authorization: `dooray-api ${token}`,
    Accept: 'application/json',
  };
  if (body != null) headers['Content-Type'] = 'application/json';
  const res = await fetch(requestUrl(config, pathOrUrl), { method, headers, body });
  const text = await res.text();
  let parsed = text;
  try { parsed = JSON.parse(text); } catch {}
  if (!res.ok) {
    console.error(JSON.stringify({ ok: false, status: res.status, statusText: res.statusText, body: parsed }, null, 2));
    process.exit(1);
  }
  console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));
  process.exit(0);
}

console.error(`Unknown command: ${args.command}`);
usage();
process.exit(2);
