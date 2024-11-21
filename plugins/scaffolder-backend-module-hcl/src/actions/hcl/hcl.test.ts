/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { mockServices } from '@backstage/backend-test-utils';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs-extra';
import { tmpdir } from 'os';
import { PassThrough } from 'stream';
import { createHclMergeAction, createHclMergeFilesAction } from './hcl';

const TMP_DIR = tmpdir();

beforeEach(() => {
  jest.clearAllMocks();
});

describe('createHclMergeAction', () => {
  const mockContext = {
    logger: mockServices.logger.mock(),
    logStream: new PassThrough(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(),
    checkpoint: jest.fn(),
    getInitiatorCredentials: jest.fn(),
    workspacePath: '.',
  };

  it('should merge HCL content', async () => {
    const a = `
    variable "name" {
      description = "Name to be used on all the resources as identifier"
      type        = string
      default     = ""

      map = {
        foo = "bar"
      }
    }`;

    const b = `
    variable "name" {
      type        = string
      default     = "my-name"

      map = {
        bar = "baz"
      }
    }`;

    // with mergeMapKeys set to false, the map will be overridden
    const expected = `variable "name" {
  default     = "my-name"
  description = "Name to be used on all the resources as identifier"
  map = {
    bar = "baz"
  }
  type = string
}

`;

    const mockCtx = {
      ...mockContext,
      input: {
        aSourceContent: a,
        bSourceContent: b,
        options: {
          mergeMapKeys: false,
        },
      },
    };

    // @ts-expect-error
    await createHclMergeAction().handler(mockCtx);

    expect(mockCtx.output.mock.calls[0][0]).toEqual('hcl');
    expect(mockCtx.output.mock.calls[0][1]).toEqual(expected);
  });

  it('should merge HCL content with mergeMapKeys set to true', async () => {
    const a = `
    variable "name" {
      type        = string

      map1 = {
        foo = "bar"
      }
    }`;

    const b = `
    variable "name" {
      default     = "my-name"

      map1 = {
        bar = "baz"
      }
    }`;

    // with mergeMapKeys set to true, the map will be merged
    const expected = `variable "name" {
  default = "my-name"
  map1 = {
    bar = "baz"
    foo = "bar"
  }
  type = string
}

`;

    const mockCtx = {
      ...mockContext,
      input: {
        aSourceContent: a,
        bSourceContent: b,
        options: {
          mergeMapKeys: true,
        },
      },
    };

    // @ts-expect-error
    await createHclMergeAction().handler(mockCtx);

    expect(mockCtx.output.mock.calls[0][0]).toEqual('hcl');
    expect(mockCtx.output.mock.calls[0][1]).toEqual(expected);
  });
});

describe('createHclMergeFilesAction', () => {
  const mockContext = {
    logger: mockServices.logger.mock(),
    logStream: new PassThrough(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(),
    checkpoint: jest.fn(),
    getInitiatorCredentials: jest.fn(),
    workspacePath: TMP_DIR,
  };

  it('should merge HCL files', async () => {
    const a = `
    variable "name" {
      description = "Name to be used on all the resources as identifier"
      type        = string
      default     = ""
    }`;

    const b = `
    variable "name" {
      type        = string
      default     = "my-name"
    }`;

    const expected = `variable "name" {
  default     = "my-name"
  description = "Name to be used on all the resources as identifier"
  type        = string
}

`;

    const aPath = `${mockContext.workspacePath}/${randomBytes(12).toString(
      'hex',
    )}.hcl`;
    await writeFileSync(aPath, a, 'utf8');

    const bPath = `${mockContext.workspacePath}/${randomBytes(12).toString(
      'hex',
    )}.hcl`;
    await writeFileSync(bPath, b, 'utf8');

    const mockCtx = {
      ...mockContext,
      input: {
        aSourcePath: aPath,
        bSourcePath: bPath,
        options: {
          mergeMapKeys: false,
        },
      },
    };

    // @ts-expect-error
    await createHclMergeFilesAction().handler(mockCtx);

    expect(mockCtx.output.mock.calls[0][0]).toEqual('hcl');
    expect(mockCtx.output.mock.calls[0][1]).toEqual(expected);
  });

  it('should merge HCL files with mergeMapKeys set to true', async () => {
    const a = `
  locals {
    my_var = {
      foo = "bar"
    }
    my_var2 = {
      bar = "baz"
    }
  }
  
  module "my_module" {
    name = "myname"
    my_map = {
      "map_a" = {
        a     = "b"
        value = "a"
        nested_map = {
          "foo" = bar # comment
        }
      }
      map_b = {
        value = "b"
      }
    }
    version = "0.0.0"
    var     = local.my_var
  }
  `;

    const b = `
  locals {
    my_var = {
      bar = "baz"
    }
  }
  
  module "my_module" {
    my_map = {
      "map_a" = {
        value      = "b"
        nested_map = {
          "bar" = baz # comment
        }
      }
    }
    version = "0.0.2"
    var     = local.my_var
  }
  
  // some comment
  `;

    const expected = `locals {
  my_var = {
    bar = "baz"
    foo = "bar"
  }
  my_var2 = {
    bar = "baz"
  }
}


module "my_module" {
  my_map = {
    "map_a" = {
      value = "b"
      nested_map = {
        "bar" = baz # comment
      }
    }
    map_b = {
      value = "b"
    }
  }
  name    = "myname"
  var     = local.my_var
  version = "0.0.2"
}

`;

    const aPath = `${mockContext.workspacePath}/${randomBytes(12).toString(
      'hex',
    )}.hcl`;
    await writeFileSync(aPath, a, 'utf8');

    const bPath = `${mockContext.workspacePath}/${randomBytes(12).toString(
      'hex',
    )}.hcl`;
    await writeFileSync(bPath, b, 'utf8');

    const mockCtx = {
      ...mockContext,
      input: {
        aSourcePath: aPath,
        bSourcePath: bPath,
        options: {
          mergeMapKeys: true,
        },
      },
    };

    // @ts-expect-error
    await createHclMergeFilesAction().handler(mockCtx);

    expect(mockCtx.output.mock.calls[0][0]).toEqual('hcl');
    expect(mockCtx.output.mock.calls[0][1]).toEqual(expected);
  });
});
