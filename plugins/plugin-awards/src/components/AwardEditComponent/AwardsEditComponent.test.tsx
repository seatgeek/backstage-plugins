import React from 'react';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { screen } from '@testing-library/react';
import {
  setupRequestMockHandlers,
  renderInTestApp,
  TestApiProvider,
} from "@backstage/test-utils";
import { v4 as uuid } from "uuid";
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { AwardsApi, awardsApiRef } from '../../api';
import { AwardsEditComponent } from './AwardEditComponent';

// Reference: https://github.com/backstage/backstage/blob/e77d833c6958e85ffe2ffc7f0da6c830dcb25ebe/plugins/azure-devops/src/hooks/useReadme.test.tsx#L32
describe('AwardsEditComponent', () => {
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
  }
  const catalogApi = catalogApiRefMock as Partial<CatalogApi> as CatalogApi;

  // setup mock response
  beforeEach(() => {
    server.use(
      rest.get('/*', (_, res, ctx) => res(ctx.status(200), ctx.json({}))),
    );
  });

  it('should render', async () => {

    awardsApiRefMock.getAwards.mockResolvedValue([
      {
        uid: uuid().toString(),
        name: "Mock Award",
        description: "Mock Award Description",
        image: "base64 blob",
        owners: ["default:user/user1"],
        recipients: ["default:user/user1"],
      }
    ])

    await renderInTestApp(
      <TestApiProvider apis={[
          [awardsApiRef, awardsApi],
          [catalogApiRef, catalogApi],
          ]}>
        <AwardsEditComponent />
      </TestApiProvider>
    );
    expect(screen.getByText("Mock Award Description")).toBeInTheDocument();
  });
});
