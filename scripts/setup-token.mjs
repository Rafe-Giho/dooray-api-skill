#!/usr/bin/env node
import { main } from './setup-keychain-token.mjs';

process.exit(await main(process.argv));
