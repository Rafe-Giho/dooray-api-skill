#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { credentialStoreName, loadConfig, storeCredentialToken } from './dooray-common.mjs';

function parse(argv) {
  const args = { service: null, account: null, config: process.env.DOORAY_CONFIG, token: process.env.DOORAY_API_TOKEN || process.env.DOORAY_TOKEN };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--config') args.config = argv[++i];
    else if (x === '--service') args.service = argv[++i];
    else if (x === '--account') args.account = argv[++i];
    else if (x === '--token-stdin') args.tokenStdin = true;
    else if (x === '--help' || x === '-h') args.help = true;
    else if (!args.service) args.service = x;
    else if (!args.account) args.account = x;
    else throw new Error(`Unknown argument: ${x}`);
  }
  return args;
}
function readAllStdin() {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { data += chunk; });
    process.stdin.on('error', reject);
    process.stdin.on('end', () => resolve(data));
  });
}
async function readSecret(prompt) {
  if (!process.stdin.isTTY) return readAllStdin();
  process.stderr.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  let value = '';
  return await new Promise((resolve, reject) => {
    const finish = () => {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stderr.write('\n');
      resolve(value);
    };
    process.stdin.on('data', ch => {
      if (ch === '\u0003') {
        process.stdin.setRawMode(false);
        process.stderr.write('\n');
        reject(new Error('Aborted.'));
      } else if (ch === '\r' || ch === '\n') finish();
      else if (ch === '\b' || ch === '\u007f') value = value.slice(0, -1);
      else value += ch;
    });
  });
}

export async function main(argv = process.argv) {
const args = parse(argv);
if (args.help) {
  console.log(`Usage:
  node setup-token.mjs [service] [account] [--config FILE]
  printf '%s' "$DOORAY_API_TOKEN" | node setup-token.mjs --token-stdin

Stores the token in the current OS credential store (${credentialStoreName()} on this machine).
Requires the optional keytar package: run npm install in this skill directory first.

Compatibility alias:
  node setup-keychain-token.mjs [service] [account]`);
  return 0;
}
let baseConfig = {};
try {
  baseConfig = loadConfig(args.config).config;
} catch (error) {
  if (args.config) throw error;
}
const config = {
  ...baseConfig,
  ...(args.service ? { tokenCredentialService: args.service } : {}),
  ...(args.account ? { tokenCredentialAccount: args.account } : {}),
};
const service = config.tokenCredentialService || config.tokenKeychainService || 'dooray-api-token';
const account = config.tokenCredentialAccount || config.tokenKeychainAccount || 'default';
const token = args.tokenStdin ? await readAllStdin() : (args.token || await readSecret(`Dooray API token for service=${service} account=${account}: `));
const stored = await storeCredentialToken(config, token);
console.log(`Stored Dooray API token in ${stored.store}: service=${stored.service} account=${stored.account}`);
return 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  process.exit(await main(process.argv));
}
