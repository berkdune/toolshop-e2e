#!/usr/bin/env bash
# Runs the full suite plus the defect reproductions against the live
# deployment, merges both into a single HTML report and publishes it to
# GitHub Pages (served from the live-report branch).
set -euo pipefail
cd "$(dirname "$0")/.."

rm -rf all-blobs blob-report playwright-report
npx playwright test --reporter=blob,line
mkdir -p all-blobs && mv blob-report/*.zip all-blobs/main.zip
DEFECTS=1 npx playwright test --project=defects --reporter=blob,line || true
mv blob-report/*.zip all-blobs/defects.zip
npx playwright merge-reports --reporter=html ./all-blobs

tmp=$(mktemp -d)
cp -R playwright-report/. "$tmp"
touch "$tmp/.nojekyll"
git -C "$tmp" init -q -b live-report
git -C "$tmp" add -A
git -C "$tmp" commit -q -m "report: full run against the live deployment"
git -C "$tmp" push -f "$(git remote get-url origin)" live-report
rm -rf "$tmp"
echo "Published: https://berkdune.github.io/toolshop-e2e/"
