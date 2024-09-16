#!/bin/bash
#
# Copyright SeatGeek
# Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
#
wasm_dir=${WASM_OUTPUT_DIR:-"src/wasm"}
echo "Packaging WASM"
wasm_path="$wasm_dir/main.wasm"
GOOS=js GOARCH=wasm go get .
GOOS=js GOARCH=wasm go build -o $wasm_path
gzip -9 -v -c $wasm_path > $wasm_path.gz
rm $wasm_path

echo "WASM exported to $wasm_path.gz"
