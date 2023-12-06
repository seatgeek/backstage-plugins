import React, { PropsWithChildren, useEffect } from 'react';
import {
  EntityKindFilter,
  EntityListProvider,
  useEntityList,
} from '@backstage/plugin-catalog-react';

const TemplateListProviderInner = (props: PropsWithChildren<{}>) => {
  const { updateFilters } = useEntityList();
  useEffect(() => {
    updateFilters({
      kind: new EntityKindFilter('template'),
    });
  }, [updateFilters]);

  return <>{props.children} </>;
};

/*
 * Any EntityListProvider that is forced to provide Template entities.
 */
export const TemplateListProvider = (props: PropsWithChildren<{}>) => {
  return (
    <EntityListProvider>
      <TemplateListProviderInner {...props} />{' '}
    </EntityListProvider>
  );
};
