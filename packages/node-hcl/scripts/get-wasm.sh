#!/bin/bash
#
# Copyright SeatGeek
# Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
#
wasm_dir=${WASM_OUTPUT_DIR:-"src/wasm"}
echo "Copying wasm_exec.js from GOROOT"
cp -rf "$(go env GOROOT)/misc/wasm/wasm_exec.js" $wasm_dir
