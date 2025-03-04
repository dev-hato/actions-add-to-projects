#!/usr/bin/env bash

yq -i ".engines.node|=\"$(cat .node-version)\"" package.json
npm install
