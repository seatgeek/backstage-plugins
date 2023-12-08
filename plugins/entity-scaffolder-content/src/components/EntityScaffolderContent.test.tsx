jest.mock('@backstage/plugin-catalog-react', () => ({
    useEntity: jest.fn(),
    useEntityList: jest.fn(),
}));

import React from 'react';
import {
    catalogApiRef,
} from '@backstage/plugin-catalog-react';
import { useEntity, useEntityList } from '@backstage/plugin-catalog-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { errorApiRef } from '@backstage/core-plugin-api';
import { EntityScaffolderContent } from './EntityScaffolderContent';
import { SystemEntity } from '@backstage/catalog-model';
import {
    TemplateEntityV1beta3,
} from '@backstage/plugin-scaffolder-common';

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

    beforeEach(() => {
        jest.clearAllMocks();

        (useEntity as jest.Mock).mockReturnValue({ entity: pageEntity });
    });

    it('should show filtered templates', async () => {
        const { getByText } = await renderInTestApp(
            <TestApiProvider apis={[[errorApiRef, {}], [catalogApiRef, mockCatalogApi]]}>
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
        expect(getByText('create-repo')).not.toBeInTheDocument();
    });
});
