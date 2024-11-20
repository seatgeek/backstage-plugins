/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import {
  TemplateAction,
  createTemplateAction,
} from '@backstage/plugin-scaffolder-node';
import { JsonObject, JsonValue } from '@backstage/types';
import { MergeOptions, merge } from '@seatgeek/node-hcl';

import { ensureDirSync, readFileSync, writeFileSync } from 'fs-extra';
import { dirname } from 'path';
import { z } from 'zod';

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

const optionsSchema = z
  .object({
    mergeMapKeys: z.boolean().optional().default(false),
  })
  .optional()
  .default({ mergeMapKeys: false });

export const createHclMergeAction = (): TemplateAction<{
  aSourceContent: string;
  bSourceContent: string;
  options: JsonObject | undefined;
}> => {
  const inputSchema = z.object({
    aSourceContent: z.string().describe('The HCL content to be merged'),
    bSourceContent: z.string().describe('The HCL content to be merged'),
    options: optionsSchema,
  });

  return createTemplateAction<{
    aSourceContent: string;
    bSourceContent: string;
    options: JsonValue | undefined;
  }>({
    id: 'hcl:merge',
    schema: {
      input: inputSchema,
      output: z.object({
        hcl: z.string(),
      }),
    },
    async handler(ctx) {
      const input = inputSchema.safeParse(ctx.input);
      if (!input.success) {
        throw new Error(
          `Invalid input: ${Object.keys(input.error.flatten().fieldErrors)}`,
        );
      }

      ctx.logger.error('output', input.data.options);

      const out = await merge(
        input.data.aSourceContent,
        input.data.bSourceContent,
        input.data.options,
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
  const inputSchema = z.object({
    aSourceContent: z.string().describe('The HCL content to be merged'),
    bSourceContent: z.string().describe('The HCL content to be merged'),
    options: optionsSchema,
    outputPath: z
      .string()
      .describe('The path to write the merged HCL content to'),
  });

  return createTemplateAction<{
    aSourceContent: string;
    bSourceContent: string;
    options: JsonValue | undefined;
    outputPath: string;
  }>({
    id: 'hcl:merge:write',
    schema: {
      input: inputSchema,
    },
    async handler(ctx) {
      const input = inputSchema.safeParse(ctx.input);
      if (!input.success) {
        throw new Error(
          `Invalid input: ${Object.keys(input.error.flatten().fieldErrors)}`,
        );
      }

      const outPath = resolveSafeChildPath(
        ctx.workspacePath,
        input.data.outputPath,
      );

      ensureDirSync(dirname(outPath));

      await mergeWrite(
        input.data.aSourceContent,
        input.data.bSourceContent,
        input.data.options,
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
  const inputSchema = z.object({
    aSourcePath: z.string().describe('The path to the HCL file to be merged'),
    bSourcePath: z.string().describe('The path to the HCL file to be merged'),
    options: optionsSchema,
  });

  return createTemplateAction<{
    aSourcePath: string;
    bSourcePath: string;
    options: JsonObject | undefined;
  }>({
    id: 'hcl:merge:files',
    schema: {
      input: inputSchema,
      output: z.object({
        hcl: z.string(),
      }),
    },
    async handler(ctx) {
      const input = inputSchema.safeParse(ctx.input);
      if (!input.success) {
        throw new Error(
          `Invalid input: ${Object.keys(input.error.flatten().fieldErrors)}`,
        );
      }

      const aPath = resolveSafeChildPath(
        ctx.workspacePath,
        input.data.aSourcePath,
      );
      const bPath = resolveSafeChildPath(
        ctx.workspacePath,
        input.data.bSourcePath,
      );
      const options = input.data.options;

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
  const inputSchema = z.object({
    aSourcePath: z.string().describe('The path to the HCL file to be merged'),
    bSourcePath: z.string().describe('The path to the HCL file to be merged'),
    options: optionsSchema,
    outputPath: z
      .string()
      .describe('The path to write the merged HCL content to'),
  });

  return createTemplateAction<{
    aSourcePath: string;
    bSourcePath: string;
    options: JsonObject | undefined;
    outputPath: string;
  }>({
    id: 'hcl:merge:files:write',
    schema: {
      input: inputSchema,
    },
    async handler(ctx) {
      const input = inputSchema.safeParse(ctx.input);
      if (!input.success) {
        throw new Error(
          `Invalid input: ${Object.keys(input.error.flatten().fieldErrors)}`,
        );
      }

      const aPath = resolveSafeChildPath(
        ctx.workspacePath,
        input.data.aSourcePath,
      );
      const bPath = resolveSafeChildPath(
        ctx.workspacePath,
        input.data.bSourcePath,
      );
      const outPath = resolveSafeChildPath(
        ctx.workspacePath,
        input.data.outputPath,
      );
      const options = input.data.options;

      ensureDirSync(dirname(outPath));

      await mergeFilesWrite(aPath, bPath, options, outPath);
    },
  });
};
