/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import React from 'react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { screen } from '@testing-library/react';
import {
  setupRequestMockHandlers,
  renderInTestApp,
  TestApiProvider,
} from '@backstage/test-utils';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { AwardsApi, awardsApiRef } from '../../api';
import { AwardsEditPage } from './AwardsEditPage';

// Reference: https://github.com/backstage/backstage/blob/e77d833c6958e85ffe2ffc7f0da6c830dcb25ebe/plugins/azure-devops/src/hooks/useReadme.test.tsx#L32
describe('AwardsEditPage', () => {
  const server = setupServer();
  // Enable sane handlers for network requests
  setupRequestMockHandlers(server);

  const awardsApiRefMock = {
    getAwards: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };
  const awardsApi = awardsApiRefMock as Partial<AwardsApi> as AwardsApi;

  const catalogApiRefMock = {
    getEntities: jest.fn(),
  };
  const catalogApi = catalogApiRefMock as Partial<CatalogApi> as CatalogApi;

  // setup mock response
  beforeEach(() => {
    server.use(
      rest.get('/*', (_, res, ctx) => res(ctx.status(200), ctx.json({}))),
    );
  });

  it('should render', async () => {
    await renderInTestApp(
      <TestApiProvider
        apis={[
          [awardsApiRef, awardsApi],
          [catalogApiRef, catalogApi],
        ]}
      >
        <AwardsEditPage />
      </TestApiProvider>,
    );
    expect(
      screen.getByText('A simple and fun way to manage awards'),
    ).toBeInTheDocument();
  });
});
