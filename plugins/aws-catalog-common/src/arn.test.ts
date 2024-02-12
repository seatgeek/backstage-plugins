/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { arn } from '.';

describe('arn', () => {
  const arnString = 'arn:aws:rds:us-east-1:123456789012:db:mysql-db-instance1';
  const arnObject: arn.ARN = {
    partition: 'aws',
    service: 'rds',
    region: 'us-east-1',
    accountId: '123456789012',
    resource: 'db:mysql-db-instance1',
  };

  describe('parse', () => {
    it('should parse an ARN string into an ARN object', () => {
      expect(arn.parse(arnString)).toEqual(arnObject);
    });
  });

  describe('build', () => {
    it('should build an ARN string from an ARN object', () => {
      expect(arn.build(arnObject)).toEqual(arnString);
    });
  });

  describe('validate', () => {
    it('should return true for a valid ARN string', () => {
      expect(arn.validate(arnString)).toBe(true);
    });

    it('should return false for an invalid ARN string', () => {
      expect(arn.validate('some-invalid-arn')).toBe(false);
    });
  });

  describe('linkTo', () => {
    it('should return a console link for a valid ARN string', () => {
      expect(arn.linkTo(arnString)).toBe(
        'https://console.aws.amazon.com/rds/home?region=us-east-1#database:id=mysql-db-instance1',
      );
    });

    it('should return undefined for an invalid ARN string', () => {
      expect(arn.linkTo('some-invalid-arn')).toBe(undefined);
    });

    it('should return a console link for an ARN object', () => {
      expect(arn.linkTo(arnObject)).toBe(
        'https://console.aws.amazon.com/rds/home?region=us-east-1#database:id=mysql-db-instance1',
      );
    });
  });

  describe('ANNOTATION', () => {
    it('should be defined', () => {
      expect(arn.ANNOTATION).toBe('amazonaws.com/arn');
    });
  });
});
