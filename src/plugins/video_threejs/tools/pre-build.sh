#!/bin/bash

set -e

exit


cat node_modules/@types/three/src/**/*.d.ts > src/types/temp.txt
grep -v "import" src/types/temp.txt | sed 's/export//' > src/types/three.txt
rm src/types/temp.txt

