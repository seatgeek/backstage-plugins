#!/bin/bash
#
# Copyright SeatGeek
# Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
#
wasm_dir="src/wasm"
echo "Copying wasm_exec.js from GOROOT"
cp -rf "$(go env GOROOT)/misc/wasm/wasm_exec.js" $wasm_dir

echo "Building WASM"

wasm_path="$wasm_dir/main.wasm"
GOOS=js GOARCH=wasm go get .
GOOS=js GOARCH=wasm go build -o $wasm_path
gzip -9 -v -c $wasm_path > $wasm_path.gz

echo "WASM exported to $wasm_path.gz"
