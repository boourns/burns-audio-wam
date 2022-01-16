#!/bin/bash

set -e

mkdir -p tmp

./node_modules/.bin/webpack

emcc \
./src/main.cpp \
../../../vendor/eurorack/elements/dsp/*.cc \
../../../vendor/eurorack/elements/resources.cc \
../../../vendor/eurorack/stmlib/utils/random.cc \
../../../vendor/eurorack/stmlib/dsp/units.cc \
../../../vendor/eurorack/stmlib/dsp/atan.cc \
../shared/src/resampler/resample.c \
-I../shared/src/resampler \
-I../../../vendor/eurorack -DTEST=1 \
-O1 \
-s WASM=1 \
-s ALLOW_MEMORY_GROWTH=1 \
-s BINARYEN_ASYNC_COMPILATION=0 \
-s SINGLE_FILE=1 \
-s MODULARIZE=1 \
--bind \
-o dist/SpectrumModalCore.js
