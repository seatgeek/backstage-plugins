/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
jest.mock('@backstage/plugin-catalog-react', () => {
  return {
    ...jest.requireActual('@backstage/plugin-catalog-react'),
    useEntityList: jest.fn(),
    useEntity: jest.fn(),
  };
});

jest.mock('@backstage/plugin-scaffolder-react/alpha', () => {
  return {
    ...jest.requireActual('@backstage/plugin-scaffolder-react/alpha'),
    Workflow: jest.fn(),
  };
});

import { SystemEntity } from '@backstage/catalog-model';
import { errorApiRef } from '@backstage/core-plugin-api';
import {
  MockStarredEntitiesApi,
  catalogApiRef,
  starredEntitiesApiRef,
  useEntity,
  useEntityList,
} from '@backstage/plugin-catalog-react';
import { permissionApiRef } from '@backstage/plugin-permission-react';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import { scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import { Workflow } from '@backstage/plugin-scaffolder-react/alpha';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { act } from '@testing-library/react';
import React from 'react';
import { EntityScaffolderContent } from './EntityScaffolderContent';

const defaultSteps = [{ action: 'action' }];

describe('EntityScaffolderContent', () => {
  const pageEntity: SystemEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'System',
    metadata: {
      name: 'tickets',
    },
    spec: {
      owner: 'product',
    },
  };

  const templates: TemplateEntityV1beta3[] = [
    {
      apiVersion: 'scaffolder.backstage.io/v1beta3',
      kind: 'Template',
      metadata: {
        name: 'create-db',
      },
      spec: {
        type: 'resource',
        steps: defaultSteps,
      },
    },
    {
      apiVersion: 'scaffolder.backstage.io/v1beta3',
      kind: 'Template',
      metadata: {
        name: 'create-repo',
      },
      spec: {
        type: 'system',
        steps: defaultSteps,
      },
    },
  ];

  const mockCatalogApi = {
    getEntities: async () => ({
      items: [...templates, pageEntity],
    }),
  };

  const mockPermissionApi = {
    authorize: async (_: any) => ({
      result: 'ALLOW',
    }),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();

    (useEntity as jest.Mock).mockReturnValue({ entity: pageEntity });
    // There may be a way to get rid of this mock entirely and just rely on
    // the mockCatalogApi, but that hasn't worked on some attempts.
    (useEntityList as jest.Mock).mockReturnValue({
      entities: [...templates, pageEntity],
      loading: false,
      error: null,
      updateFilters: jest.fn(),
    });
    (Workflow as jest.Mock).mockReturnValue(<div>Mock Workflow</div>);
  });

  it('should show filtered templates', async () => {
    const { getByText, queryByText } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [errorApiRef, {}],
          [permissionApiRef, mockPermissionApi],
          [catalogApiRef, mockCatalogApi],
          [starredEntitiesApiRef, new MockStarredEntitiesApi()],
        ]}
      >
        <EntityScaffolderContent
          templateGroupFilters={[
            {
              title: 'Resources',
              filter: (_, template) => template.spec.type === 'resource',
            },
          ]}
          buildInitialState={() => ({})}
        />
      </TestApiProvider>,
    );

    expect(getByText('create-db')).toBeInTheDocument();
    expect(queryByText('create-repo')).not.toBeInTheDocument();
  });

  it('should allow a user to select a template', async () => {
    const { getByText } = await renderInTestApp(
      <TestApiProvider
        apis={[
          [errorApiRef, {}],
          [catalogApiRef, mockCatalogApi],
          [permissionApiRef, mockPermissionApi],
          [starredEntitiesApiRef, new MockStarredEntitiesApi()],
          [scaffolderApiRef, {}],
        ]}
      >
        <EntityScaffolderContent
          templateGroupFilters={[
            {
              title: 'Resources',
              filter: (_, template) => template.spec.type === 'resource',
            },
          ]}
          buildInitialState={entity => ({
            system: entity.metadata.name,
          })}
        />
      </TestApiProvider>,
    );

    act(() => {
      getByText('Choose').click();
    });

    expect(Workflow).toHaveBeenCalledWith(
      expect.objectContaining({
        initialState: {
          system: 'tickets',
        },
        templateName: 'create-db',
      }),
      {},
    );
  });
});
