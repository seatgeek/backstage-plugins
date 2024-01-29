/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { awardsPlugin } from './plugin';

describe('awards', () => {
  it('should export plugin', () => {
    expect(awardsPlugin).toBeDefined();
  });
});
