/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import {
  EntityKindFilter,
  EntityListProvider,
  useEntityList,
} from '@backstage/plugin-catalog-react';
import React, { PropsWithChildren, useEffect } from 'react';

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
      <TemplateListProviderInner {...props} />
    </EntityListProvider>
  );
};
