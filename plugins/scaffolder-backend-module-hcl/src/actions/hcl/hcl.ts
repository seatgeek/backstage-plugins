/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { resolveSafeChildPath } from '@backstage/backend-plugin-api';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { merge } from '@seatgeek/node-hcl';

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
  outPath: string,
): Promise<void> {
  const out = await merge(a, b);

  try {
    await writeFileSync(outPath, out, 'utf8');
  } catch (error) {
    console.error(`error writing hcl file: ${(error as Error).message}`);
  }
}

async function mergeFiles(aPath: string, bPath: string): Promise<string> {
  const a = await readFileSafe(aPath);
  const b = await readFileSafe(bPath);

  return await merge(a, b);
}

async function mergeFilesWrite(
  aPath: string,
  bPath: string,
  outPath: string,
): Promise<void> {
  const out = await mergeFiles(aPath, bPath);

  try {
    await writeFileSync(outPath, out, 'utf8');
  } catch (error) {
    console.error(`error writing hcl file: ${(error as Error).message}`);
  }
}

export const createHclMergeAction = () => {
  const inputSchema = z.object({
    aSourceContent: z.string().describe('The HCL content to be merged'),
    bSourceContent: z.string().describe('The HCL content to be merged'),
  });

  return createTemplateAction<{
    aSourceContent: string;
    bSourceContent: string;
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

      const out = await merge(
        input.data.aSourceContent,
        input.data.bSourceContent,
      );
      ctx.output('hcl', out);
    },
  });
};

export const createHclMergeWriteAction = () => {
  const inputSchema = z.object({
    aSourceContent: z.string().describe('The HCL content to be merged'),
    bSourceContent: z.string().describe('The HCL content to be merged'),
    outputPath: z
      .string()
      .describe('The path to write the merged HCL content to'),
  });

  return createTemplateAction<{
    aSourceContent: string;
    bSourceContent: string;
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
        outPath,
      );
    },
  });
};

export const createHclMergeFilesAction = () => {
  const inputSchema = z.object({
    aSourcePath: z.string().describe('The path to the HCL file to be merged'),
    bSourcePath: z.string().describe('The path to the HCL file to be merged'),
  });

  return createTemplateAction<{ aSourcePath: string; bSourcePath: string }>({
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

      const out = await mergeFiles(aPath, bPath);
      ctx.output('hcl', out);
    },
  });
};

export const createHclMergeFilesWriteAction = () => {
  const inputSchema = z.object({
    aSourcePath: z.string().describe('The path to the HCL file to be merged'),
    bSourcePath: z.string().describe('The path to the HCL file to be merged'),
    outputPath: z
      .string()
      .describe('The path to write the merged HCL content to'),
  });

  return createTemplateAction<{
    aSourcePath: string;
    bSourcePath: string;
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

      ensureDirSync(dirname(outPath));

      await mergeFilesWrite(aPath, bPath, outPath);
    },
  });
};
