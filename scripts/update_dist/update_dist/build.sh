#!/usr/bin/env bash
set -e

npm ci
tsc --noEmit
npx esbuild --platform=node --bundle --format=cjs --outdir=dist src/remove_prs_and_issues.ts
