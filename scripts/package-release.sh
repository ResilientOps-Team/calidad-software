#!/usr/bin/env bash
# Compila la versión del release como sitio estático y la empaqueta en dist/.
# semantic-release lo ejecuta en la fase "prepare", antes de crear el tag.
set -euo pipefail

version="${1:?Uso: package-release.sh <version>}"
name="resilientops-v${version}"

# Solo en el workspace del runner: no se hace commit de package.json
npm pkg set version="${version}"

NEXT_OUTPUT=export PAGES_BASE_PATH="${PAGES_BASE_PATH:-/calidad-software}" pnpm run build

test -s out/index.html || { echo "::error::El build no generó out/index.html"; exit 1; }
grep -q "content=\"${version}\"" out/index.html || { echo "::error::out/index.html no declara la versión ${version}"; exit 1; }

rm -rf dist
mkdir -p dist
(cd out && zip -qr "../dist/${name}.zip" .)
(cd dist && sha256sum "${name}.zip" > "${name}.zip.sha256")

echo "Artefactos generados:"
ls -l dist
