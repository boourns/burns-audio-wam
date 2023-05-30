#!/bin/bash

set -e

# do not auto-run, we had to manually fix up the types:
# - remove the export { a as b}
# - remove other import {a, b, c,} from "./constants"
exit


cat node_modules/@types/three/src/**/*.d.ts > src/types/temp.txt
grep -v "import" src/types/temp.txt | sed 's/export//' > src/types/three.txt
rm src/types/temp.txt

