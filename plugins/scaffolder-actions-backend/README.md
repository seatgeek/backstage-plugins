# scaffolder-backend-module-actions

Welcome to the scaffolder-backend-module-actions plugin!

## Getting started

### From your Backstage root directory

```bash
# From your Backstage root directory
yarn add --cwd packages/backend @seatgeek/backstage-plugin-scaffolder-actions-backend
```

Then ensure that both the scaffolder and this module are added to your backend:

```typescript
// In packages/backend/src/index.ts
const backend = createBackend();
// ...
backend.add(import('@seatgeek/backstage-plugin-scaffolder-actions-backend'));
```

After that you can use the actions in your template.

## Actions

This contains a collection of actions to use in scaffolder templates:

- `hcl:merge` Merge HCL strings
- `hcl:merge:write` Merge HCL strings and write to a file
- `hcl:merge:files` Merge HCL files
- `hcl:merge:files:write` Merge HCL files and write to a file