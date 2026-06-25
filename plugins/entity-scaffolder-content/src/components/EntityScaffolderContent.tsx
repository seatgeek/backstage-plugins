/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import { Entity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { TemplateEntityV1beta3 } from '@backstage/plugin-scaffolder-common';
import {
  SecretsContextProvider,
  TemplateGroupFilter,
} from '@backstage/plugin-scaffolder-react';
import {
  TemplateCard,
  TemplateGroups,
} from '@backstage/plugin-scaffolder-react/alpha';
import type { JsonValue } from '@backstage/types';
import { EmbeddedScaffolderWorkflow } from '@frontside/backstage-plugin-scaffolder-workflow';
import { Button } from '@material-ui/core';
import React, { useMemo, useState } from 'react';
import { TemplateListProvider } from './TemplateListProvider';

type TemplateGroupFilterWithEntityCapture = {
  title?: React.ReactNode;
  filter: (entity: Entity, template: TemplateEntityV1beta3) => boolean;
};

/**
 * @public
 *
 * Props for {@link EntityScaffolderContent}
 * */
export type EntityScaffolderContentProps = {
  templateGroupFilters: TemplateGroupFilterWithEntityCapture[];
  buildInitialState: (
    entity: Entity,
    template: TemplateEntityV1beta3,
  ) => Record<string, JsonValue>;
  ScaffolderFieldExtensions?: React.ReactNode;
  components?: {
    TemplateCard?: typeof TemplateCard;
  };
};

/**
 * Use templates from within the EntityPage.
 *
 * @public
 */
export const EntityScaffolderContent = ({
  templateGroupFilters,
  buildInitialState,
  ScaffolderFieldExtensions,
  components,
}: EntityScaffolderContentProps) => {
  const { entity } = useEntity();
  const [selectedTemplate, setSelectedTemplate] =
    useState<TemplateEntityV1beta3 | null>(null);
  const groupFilters: TemplateGroupFilter[] = useMemo(() => {
    return templateGroupFilters.map(({ title, filter }) => ({
      title,
      filter: (template: TemplateEntityV1beta3) => filter(entity, template),
    }));
  }, [templateGroupFilters, entity]);
  return (
    <SecretsContextProvider>
      <TemplateListProvider>
        {selectedTemplate ? (
          <>
            <EmbeddedScaffolderWorkflow
              namespace={selectedTemplate.metadata.namespace || 'default'}
              templateName={selectedTemplate.metadata.name}
              initialState={buildInitialState(entity, selectedTemplate)}
              onError={(error: Error | undefined) => (
                <h2>{error?.message ?? 'Error running workflow'}</h2>
              )}
            >
              {ScaffolderFieldExtensions ?? null}
            </EmbeddedScaffolderWorkflow>
            <Button
              variant="contained"
              color="primary"
              onClick={() => setSelectedTemplate(null)}
            >
              View All Templates
            </Button>
          </>
        ) : (
          <TemplateGroups
            groups={groupFilters}
            onTemplateSelected={setSelectedTemplate}
            TemplateCardComponent={components?.TemplateCard ?? undefined}
          />
        )}
      </TemplateListProvider>
    </SecretsContextProvider>
  );
};
