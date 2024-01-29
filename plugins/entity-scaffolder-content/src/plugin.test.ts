/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { entityScaffolderContentPlugin } from './plugin';

describe('entity-scaffolder-content', () => {
  it('should export plugin', () => {
    expect(entityScaffolderContentPlugin).toBeDefined();
  });
});
