/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { wasm } from "./bridge";

export async function merge(a: string, b: string): Promise<string> {
  return await wasm.merge(a, b);
}
