#!/bin/bash

set -e

grep -v 'import' dist/functionseq/src/FunctionSequencer.d.ts | sed 's/export //' > ./src/types/FunctionSequencer.txt
grep -v 'import' dist/functionseq/src/RemoteUI.d.ts | sed 's/export //' > ./src/types/RemoteUI.txt

