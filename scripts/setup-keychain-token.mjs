#!/usr/bin/env node
import { loadConfig, storeKeychainToken } from './dooray-common.mjs';

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

const args = parse(process.argv);
if (args.help) {
  console.log(`Usage:
  node setup-keychain-token.mjs [service] [account] [--config FILE]
  printf '%s' "$DOORAY_API_TOKEN" | node setup-keychain-token.mjs --token-stdin

Requires the optional keytar package: run npm install in this skill directory first.`);
  process.exit(0);
}
let baseConfig = {};
try {
  baseConfig = loadConfig(args.config).config;
} catch (error) {
  if (args.config) throw error;
}
const config = {
  ...baseConfig,
  ...(args.service ? { tokenKeychainService: args.service } : {}),
  ...(args.account ? { tokenKeychainAccount: args.account } : {}),
};
const service = config.tokenKeychainService || 'dooray-api-token';
const account = config.tokenKeychainAccount || 'default';
const token = args.tokenStdin ? await readAllStdin() : (args.token || await readSecret(`Dooray API token for service=${service} account=${account}: `));
const stored = await storeKeychainToken(config, token);
console.log(`Stored Dooray API token in macOS Keychain: service=${stored.service} account=${stored.account}`);
