#!/usr/bin/env node
import fs from 'node:fs';
import { expandHome, loadConfig, unwrap } from './dooray-common.mjs';
import { doorayRequest } from './dooray-http.mjs';

function parse(argv) {
  const args = {
    channel: null,
    text: null,
    textFile: null,
    yes: false,
    dryRun: false,
    json: false,
    config: process.env.DOORAY_CONFIG,
  };
  for (let i = 2; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--channel') args.channel = argv[++i];
    else if (x === '--text') args.text = argv[++i];
    else if (x === '--text-file') args.textFile = argv[++i];
    else if (x === '--yes') args.yes = true;
    else if (x === '--dry-run') args.dryRun = true;
    else if (x === '--json') args.json = true;
    else if (x === '--config') args.config = argv[++i];
    else if (x === '--help' || x === '-h') args.help = true;
    else throw new Error(`Unknown argument: ${x}`);
  }
  return args;
}
function usage() {
  console.log('Usage: node messenger-send.mjs --channel <channel-id-or-title> (--text TEXT | --text-file file.txt) [--dry-run|--yes] [--json]');
}
function textOf(args) {
  if (args.textFile) return fs.readFileSync(expandHome(args.textFile), 'utf8').replace(/^\uFEFF/, '');
  return args.text;
}
function jsonUtf8Safe(value) {
  return JSON.stringify(value).replace(/[^\x20-\x7E]/g, ch => {
    const code = ch.charCodeAt(0).toString(16).padStart(4, '0');
    return `\\u${code}`;
  });
}
function previewText(value) {
  return String(value || '').replace(/\s+/g, ' ').slice(0, 120);
}

const args = parse(process.argv);
if (args.help) {
  usage();
  process.exit(0);
}
const text = textOf(args);
if (!args.channel || !text) {
  usage();
  process.exit(2);
}

const { config } = loadConfig(args.config);
const channels = unwrap(await doorayRequest(config, 'GET', '/messenger/v1/channels'));
const channel = channels.find(c => c.id === args.channel || c.title === args.channel);
if (!channel) throw new Error(`Channel not found: ${args.channel}`);

const path = `/messenger/v1/channels/${channel.id}/send`;
const body = jsonUtf8Safe({ text });
const preview = { channel: { id: channel.id, title: channel.title || null, type: channel.type }, path, textPreview: previewText(text), unicodeEscaped: /\\u[0-9a-f]{4}/i.test(body) };

if (args.dryRun) {
  console.log(JSON.stringify({ ok: true, dryRun: true, ...preview, body }, null, 2));
  process.exit(0);
}
if (!args.yes) {
  console.error(JSON.stringify({ ok: false, message: 'Refusing to send Dooray messenger message without --yes. Use --dry-run first.', ...preview }, null, 2));
  process.exit(2);
}

const sent = unwrap(await doorayRequest(config, 'POST', path, body));
const out = { ok: true, channel: preview.channel, result: sent };
console.log(args.json ? JSON.stringify(out, null, 2) : `Sent Dooray message to ${channel.title || channel.id}`);
