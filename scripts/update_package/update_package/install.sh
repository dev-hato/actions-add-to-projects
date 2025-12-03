#!/usr/bin/env bash
set -e

yq -i ".engines.node|=\"$(cat .node-version)\"" package.json
npm install
