#!/usr/bin/env node

'use strict';

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const command = args[0];

if (command !== 'bundle') {
  console.error(`Unsupported React Native command: ${command || '<none>'}`);
  process.exit(1);
}

const workingDir = fs.realpathSync.native(process.cwd());
const reactNativeCli = path.resolve(__dirname, '../../../node_modules/react-native/cli.js');

const result = spawnSync(process.execPath, [reactNativeCli, ...args], {
  cwd: workingDir,
  env: process.env,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
