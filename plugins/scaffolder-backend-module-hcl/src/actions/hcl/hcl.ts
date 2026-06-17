/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import {
  TemplateAction,
  createTemplateAction,
} from '@backstage/plugin-scaffolder-node';
import { JsonObject } from '@backstage/types';
import { MergeOptions, merge } from '@seatgeek/node-hcl';

import { ensureDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { dirname } from 'path';

async function readFileSafe(path: string): Promise<string> {
  try {
    return readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.warn(
        `file not found at path ${path}, defaulting to empty string`,
      );
      return '';
    }

    console.error(`error reading hcl file: ${(error as Error).message}`);
    throw error;
  }
}

async function mergeWrite(
  a: string,
  b: string,
  options: MergeOptions,
  outPath: string,
): Promise<void> {
  const out = await merge(a, b, options);

  try {
    await writeFileSync(outPath, out, 'utf8');
  } catch (error) {
    console.error(`error writing hcl file: ${(error as Error).message}`);
  }
}

async function mergeFiles(
  aPath: string,
  bPath: string,
  options: MergeOptions,
): Promise<string> {
  const a = await readFileSafe(aPath);
  const b = await readFileSafe(bPath);

  return await merge(a, b, options);
}

async function mergeFilesWrite(
  aPath: string,
  bPath: string,
  options: MergeOptions,
  outPath: string,
): Promise<void> {
  const out = await mergeFiles(aPath, bPath, options);

  try {
    await writeFileSync(outPath, out, 'utf8');
  } catch (error) {
    console.error(`error writing hcl file: ${(error as Error).message}`);
  }
}

const optionsJsonSchema = {
  type: 'object' as const,
  properties: {
    mergeMapKeys: { type: 'boolean' as const, default: false },
  },
  default: { mergeMapKeys: false },
};

function defaultOptions(input: { options?: JsonObject }): MergeOptions {
  return {
    mergeMapKeys: (input.options?.mergeMapKeys as boolean | undefined) ?? false,
  };
}

export const createHclMergeAction = (): TemplateAction<{
  aSourceContent: string;
  bSourceContent: string;
  options: JsonObject | undefined;
}> => {
  return createTemplateAction<{
    aSourceContent: string;
    bSourceContent: string;
    options: JsonObject | undefined;
  }>({
    id: 'hcl:merge',
    schema: {
      input: {
        type: 'object' as const,
        required: ['aSourceContent', 'bSourceContent'],
        properties: {
          aSourceContent: {
            type: 'string',
            description: 'The HCL content to be merged',
          },
          bSourceContent: {
            type: 'string',
            description: 'The HCL content to be merged',
          },
          options: optionsJsonSchema,
        },
      },
      output: {
        type: 'object' as const,
        required: ['hcl'],
        properties: {
          hcl: { type: 'string' },
        },
      }
    },
    async handler(ctx) {
      const options = defaultOptions(ctx.input);
      const out = await merge(
        ctx.input.aSourceContent,
        ctx.input.bSourceContent,
        options,
      );
      ctx.output('hcl', out);
    },
  });
};

export const createHclMergeWriteAction = (): TemplateAction<{
  aSourceContent: string;
  bSourceContent: string;
  options: JsonObject | undefined;
  outputPath: string;
}> => {
  return createTemplateAction<{
    aSourceContent: string;
    bSourceContent: string;
    options: JsonObject | undefined;
    outputPath: string;
  }>({
    id: 'hcl:merge:write',
    schema: {
      input: {
        type: 'object' as const,
        required: ['aSourceContent', 'bSourceContent', 'outputPath'],
        properties: {
          aSourceContent: {
            type: 'string',
            description: 'The HCL content to be merged',
          },
          bSourceContent: {
            type: 'string',
            description: 'The HCL content to be merged',
          },
          options: optionsJsonSchema,
          outputPath: {
            type: 'string',
            description: 'The path to write the merged HCL content to',
          },
        },
      },
    },
    async handler(ctx) {
      const options = defaultOptions(ctx.input);
      const outPath = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.outputPath,
      );

      ensureDirSync(dirname(outPath));

      await mergeWrite(
        ctx.input.aSourceContent,
        ctx.input.bSourceContent,
        options,
        outPath,
      );
    },
  });
};

export const createHclMergeFilesAction = (): TemplateAction<{
  aSourcePath: string;
  bSourcePath: string;
  options: JsonObject | undefined;
}> => {
  return createTemplateAction<{
    aSourcePath: string;
    bSourcePath: string;
    options: JsonObject | undefined;
  }>({
    id: 'hcl:merge:files',
    schema: {
      input: {
        type: 'object' as const,
        required: ['aSourcePath', 'bSourcePath'],
        properties: {
          aSourcePath: {
            type: 'string',
            description: 'The path to the HCL file to be merged',
          },
          bSourcePath: {
            type: 'string',
            description: 'The path to the HCL file to be merged',
          },
          options: optionsJsonSchema,
        },
      },
      output: {
        type: 'object' as const,
        properties: {
          hcl: { type: 'string' },
        },
      },
    },
    async handler(ctx) {
      const options = defaultOptions(ctx.input);
      const aPath = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.aSourcePath,
      );
      const bPath = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.bSourcePath,
      );

      const out = await mergeFiles(aPath, bPath, options);
      ctx.output('hcl', out);
    },
  });
};

export const createHclMergeFilesWriteAction = (): TemplateAction<{
  aSourcePath: string;
  bSourcePath: string;
  options: JsonObject | undefined;
  outputPath: string;
}> => {
  return createTemplateAction<{
    aSourcePath: string;
    bSourcePath: string;
    options: JsonObject | undefined;
    outputPath: string;
  }>({
    id: 'hcl:merge:files:write',
    schema: {
      input: {
        type: 'object' as const,
        required: ['aSourcePath', 'bSourcePath', 'outputPath'],
        properties: {
          aSourcePath: {
            type: 'string',
            description: 'The path to the HCL file to be merged',
          },
          bSourcePath: {
            type: 'string',
            description: 'The path to the HCL file to be merged',
          },
          options: optionsJsonSchema,
          outputPath: {
            type: 'string',
            description: 'The path to write the merged HCL content to',
          },
        },
      },
    },
    async handler(ctx) {
      const options = defaultOptions(ctx.input);
      const aPath = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.aSourcePath,
      );
      const bPath = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.bSourcePath,
      );
      const outPath = resolveSafeChildPath(
        ctx.workspacePath,
        ctx.input.outputPath,
      );

      ensureDirSync(dirname(outPath));

      await mergeFilesWrite(aPath, bPath, options, outPath);
    },
  });
};
