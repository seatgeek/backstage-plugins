/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { ARN, build, validate } from '@aws-sdk/util-arn-parser';
import { ARN as Link2aws } from 'link2aws';

export * from '@aws-sdk/util-arn-parser';

export const ANNOTATION = 'amazonaws.com/arn';

export function linkTo(arn: string | ARN): string | undefined {
  const arnString = typeof arn === 'string' ? arn : build(arn);
  if (!validate(arnString)) {
    return undefined;
  }

  try {
    return new Link2aws(arnString).consoleLink;
  } catch (e) {
    return undefined;
  }
}
