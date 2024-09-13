/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { getVoidLogger } from '@backstage/backend-common';
import { randomBytes } from 'crypto';
import { writeFileSync } from 'fs-extra';
import { tmpdir } from 'os';
import { PassThrough } from 'stream';
import { createHclMergeAction, createHclMergeFilesAction } from './hcl';

// Since we have to
const TMP_DIR = tmpdir();

describe('createHclMergeAction', () => {
  const mockContext = {
    logger: getVoidLogger(),
    logStream: new PassThrough(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(),
    checkpoint: jest.fn(),
    getInitiatorCredentials: jest.fn(),
    workspacePath: '.',
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

    const mockCtx = {
      ...mockContext,
      input: {
        aSourceContent: a,
        bSourceContent: b,
      },
    };

    await createHclMergeAction().handler(mockCtx);

    expect(mockCtx.output.mock.calls[0][0]).toEqual('hcl');
    expect(mockCtx.output.mock.calls[0][1]).toEqual(expected);
  });
});

describe('createHclMergeFilesAction', () => {
  const mockContext = {
    logger: getVoidLogger(),
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
      },
    };

    await createHclMergeFilesAction().handler(mockCtx);

    expect(mockCtx.output.mock.calls[0][0]).toEqual('hcl');
    expect(mockCtx.output.mock.calls[0][1]).toEqual(expected);
  });
});
