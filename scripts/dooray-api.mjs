#!/usr/bin/env node
import fs from 'node:fs';
import { loadConfig, readTokenWithSource, expandHome, redact } from './dooray-common.mjs';
import { doorayRequest } from './dooray-http.mjs';

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
  const args = { command: argv[2], rest: [], config: process.env.DOORAY_CONFIG || '~/.config/dooray/config.json', data: null };
  if (args.command === '--help' || args.command === '-h') {
    args.command = null;
    args.help = true;
    return args;
  }
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--config') args.config = argv[++i];
    else if (a === '--data') args.data = argv[++i];
    else if (a === '--help' || a === '-h') args.help = true;
    else args.rest.push(a);
  }
  return args;
}
function payloadOf(value) {
  if (value == null) return undefined;
  if (value.startsWith('@')) return fs.readFileSync(expandHome(value.slice(1)), 'utf8');
  return value;
}

const args = parseArgs(process.argv);
if (args.help || !args.command) { usage(); process.exit(args.help ? 0 : 2); }
let loaded;
try { loaded = loadConfig(args.config); } catch (error) { console.error(error.message); process.exit(2); }
const { configPath, config } = loaded;

if (args.command === 'config') {
  let tokenAvailable = false;
  let tokenSource = 'none';
  try {
    const resolved = await readTokenWithSource(config);
    tokenAvailable = true;
    tokenSource = resolved.source;
  } catch {}
  console.log(JSON.stringify({ configPath, config: redact(config), tokenAvailable, tokenSource }, null, 2));
  process.exit(0);
}

if (args.command === 'request') {
  const [method, pathOrUrl] = args.rest;
  if (!method || !pathOrUrl) { usage(); process.exit(2); }
  try {
    const parsed = await doorayRequest(config, method, pathOrUrl, payloadOf(args.data));
    console.log(typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2));
  } catch (error) {
    console.error(JSON.stringify({ ok: false, status: error.status, message: error.message, body: error.body }, null, 2));
    process.exit(1);
  }
  process.exit(0);
}

console.error(`Unknown command: ${args.command}`);
usage();
process.exit(2);
