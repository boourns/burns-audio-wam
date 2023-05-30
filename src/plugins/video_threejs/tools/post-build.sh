#!/bin/bash

set -e

grep -v 'import' dist/video_threejs/src/ThreeJSGenerator.d.ts | sed 's/export //' > ./src/types/ThreeJSGenerator.txt
