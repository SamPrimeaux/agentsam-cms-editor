#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/analytics-app"
npm install --include=dev
npm run build
echo "PASS: analytics-app → public/analytics/"
