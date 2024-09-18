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
- **Slack Catalog**: the Slack Catalog Plugin offers catalog integrations with the Slack API.
  - [plugins/slack-catalog-backend](plugins/slack-catalog-backend/)
- **AWS Catalog**: the AWS Catalog Plugin offers catalog integrations with the AWS API.
  - [plugins/aws-catalog-backend](plugins/aws-catalog-backend)
- **Gitlab Catalog**: the Gitlab Catalog Plugin offers catalog integrations with the Gitlab API.
  - [plugins/gitlab-catalog-backend](plugins/gitlab-catalog-backend/)
- **HCL Scaffolder Actions**: the HCL Scaffolder Actions plugin includes custom actions for working with HCL in your Backstage Software Templates.
  - [plugins/scaffolder-backend-module-hcl](plugins/scaffolder-backend-module-hcl/)

Each of the plugins contain instructions for installation and development within
their respective locations.

## Preview the collection

We have created a demo Backstage application to preview the SeatGeek Backstage Plugins Collection. To view it, clone this repository and run `yarn install && yarn dev`.

If you run into issues running the above command, run `yarn --version` to check the installed yarn version. It is a known issue that the project does not work with the latest version of yarn, so it is recommended to downgrade to the highest known supported version of `1.22.x`.
