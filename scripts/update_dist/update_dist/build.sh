#!/usr/bin/env bash

npm ci
tsc --noEmit
npx esbuild --platform=node --bundle --format=esm --outdir=dist src/remove_prs_and_issues.ts
