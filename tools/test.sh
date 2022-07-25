#!/bin/bash

set -e

plugins=()

yarn install

echo "===== Testing  ==== "
cd src/plugins
for i in *; do
  if [[ -e $i/package.json && "$i" != "sdk" ]]; then
    if [[ "$1" == "" || "$1" == "$i" ]]; then
      echo "Testing $i"

      cd $i
      yarn install && yarn test
      plugins+=($i)

      cd ..
    fi
  fi
done
cd ../..

