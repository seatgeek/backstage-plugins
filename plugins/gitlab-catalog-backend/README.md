# @seatgeek/backstage-plugin-gitlab-catalog-backend

This plugin offers catalog integrations for ingesting data from gitlab API.

[![npm latest version](https://img.shields.io/npm/v/@seatgeek/backstage-plugin-gitlab-catalog-backend/latest.svg)](https://www.npmjs.com/package/@seatgeek/backstage-plugin-gitlab-catalog-backend)

## Installation

Install the `@seatgeek/backstage-plugin-gitlab-catalog-backend` package in your backend package:

```shell
# From your Backstage root directory
yarn add --cwd packages/backend @seatgeek/backstage-plugin-gitlab-catalog-backend
```

Add the following config to your `app-config.yaml`:

```yml
gitlabCatalog:
  host: ${GITLAB_HOST_CATALOG} # defaults to https://gitlab.com
  token: ${GITLAB_TOKEN_CATALOG}
```

Requires `read_user` scope with administrator level permissions to be able to view the email, see [List Users (for administrators)](https://docs.gitlab.com/ee/api/users.html#for-administrators).

## Processors

### `GitlabUserProcessor`

Enriches existing `User` entities with information from Gitlab, notably the user's Gitlab ID, based on the user's `.profile.email`.

#### Installation

Add the following to your `packages/backend/index.ts`:

```ts
// in your imports
import { catalogModuleGitlabUserProcessor } from '@seatgeek/backstage-plugin-gitlab-catalog-backend';

// in your catalog modules
backend.add(catalogModuleGitlabUserProcessor);
```
