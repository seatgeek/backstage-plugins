# SeatGeek Backstage Plugins Collection

This SeatGeek Backstage Plugins Collection offers the following plugins:

- **Awards**: the Awards Plugin is a complete solution to manage awards within Backstage.
  - [plugins/awards](plugins/awards)
  - [plugins/awards-common](plugins/awards-common)
  - [plugins/awards-backend](plugins/awards-backend)
- **Entity Scaffolder Content**: the Entity Scaffolder Plugin allows the Backstage Scaffolder to be run within the `EntityPage` and have Scaffolder fields autopopulate from Entity data.
  - [plugins/entity-scaffolder-content](plugins/entity-scaffolder-content/)
- **Catalog Backend Module Okta**: the Catalog Backend Module Okta Plugin allows users and groups to be ingested from the Okta API.
  - [plugins/catalog-backend-module-okta](plugins/catalog-backend-module-okta)

Each of the plugins contain instructions for installation and development within
their respective locations.

## Preview the collection

We have created a demo Backstage application to preview the SeatGeek Backstage Plugins Collection. To view it, clone this repository and run `yarn install && yarn dev`.