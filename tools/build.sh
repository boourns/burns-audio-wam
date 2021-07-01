#!/bin/bash

set -e

echo "===== Submodules ====="
git submodule update --init --recursive

echo "===== Building SDK ===="
cd src/plugins/sdk
yarn install
yarn build
cd ../../../

plugins=()

echo "===== Building ==== "
cd src/plugins
for i in *; do
  if [[ -e $i/package.json && "$i" != "sdk" ]]; then
    if [[ "$1" == "" || "$1" == "$i" ]]; then
      echo "Building $i"

      cd $i
      npm i && npm run build
      plugins+=($i)

      cd ..
    fi
  fi
done
cd ../..

echo "==== INSTALLING ===="
mkdir -p dist/plugins
for i in ${plugins[*]}; do
  echo "Installing dist/plugins/$i"
  mkdir -p dist/plugins/$i
  cp src/plugins/$i/dist/* dist/plugins/$i/
done

echo "=== BUILDING MANIFEST ==="
echo "[" > dist/plugins/manifest.json
for i in ${plugins[*]}; do
  echo "\"$i\"," >> dist/plugins/manifest.json
done
echo "]" >> dist/plugins/manifest.json
