/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { merge } from "./hcl";

describe("merge", () => {
  it("should merge two hcl strings", async () => {
    const a = `variable "a" {
  type        = string
  description = "Variable A"
  default     = "a"
}`;
    const b = `variable "b" {
  type        = string
  description = "Variable B"
  default     = "b"
}`;

    const expected = `variable "a" {
  type        = string
  description = "Variable A"
  default     = "a"
}

variable "b" {
  type        = string
  description = "Variable B"
  default     = "b"
}
`;

    const out = await merge(a, b);
    expect(out).toBe(expected);
  });

  it("should merge when empty string", async () => {
    const a = ``;
    const b = `variable "b" {
  type        = string
  description = "Variable B"
  default     = "b"
}`;

    const expected = `variable "b" {
  type        = string
  description = "Variable B"
  default     = "b"
}
`;

    const actual = await merge(a, b);
    expect(actual).toBe(expected);
  });
});
