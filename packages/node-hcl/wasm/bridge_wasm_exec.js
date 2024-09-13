/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
"use strict";

globalThis.require = require;

if (!globalThis.crypto) {
  const crypto = require("crypto");
  globalThis.crypto = {
    getRandomValues(b) {
      return crypto.randomFillSync(b);
    },
  };
}

require("./wasm_exec");
