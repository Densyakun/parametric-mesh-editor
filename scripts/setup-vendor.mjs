#!/usr/bin/env node

import { existsSync, mkdirSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const VENDOR_DIR = join(ROOT, 'vendor')
const TSX_SAFE_EVAL_DIR = join(VENDOR_DIR, 'tsx-safe-eval')

if (!existsSync(TSX_SAFE_EVAL_DIR)) {
  console.log('Cloning tsx-safe-eval...')
  mkdirSync(VENDOR_DIR, { recursive: true })
  execSync('git clone https://github.com/Densyakun/tsx-safe-eval.git vendor/tsx-safe-eval', {
    cwd: ROOT,
    stdio: 'inherit'
  })
  
  console.log('Installing tsx-safe-eval dependencies...')
  execSync('npm install', {
    cwd: TSX_SAFE_EVAL_DIR,
    stdio: 'inherit'
  })
  
  console.log('Building tsx-safe-eval...')
  execSync('npm run build', {
    cwd: TSX_SAFE_EVAL_DIR,
    stdio: 'inherit'
  })
  
  console.log('tsx-safe-eval setup complete!')
} else {
  console.log('tsx-safe-eval already exists, skipping setup.')
}
