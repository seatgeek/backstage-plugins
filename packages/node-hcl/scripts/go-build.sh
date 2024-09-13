#!/bin/bash
#
# Copyright SeatGeek
# Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
#
echo "Copying wasm_exec.js from GOROOT"
cp -rf "$(go env GOROOT)/misc/wasm/wasm_exec.js" wasm/

echo "Building WASM"

GOOS=js GOARCH=wasm go get .
GOOS=js GOARCH=wasm go build -o wasm/main.wasm
gzip -9 -v -c wasm/main.wasm > wasm/main.wasm.gz

echo "WASM exported to main.wasm.gz"
