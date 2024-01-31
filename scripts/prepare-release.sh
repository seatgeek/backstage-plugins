#! /bin/bash

# we need to use the link:* prefix for yarn workspaces to work, but that isn't supported by npm
# see: https://github.com/yarnpkg/yarn/issues/6079
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    find ./plugins ./packages -maxdepth 2 -name "package.json" -exec sed -i '' 's/link:\*/\*/g' {} \;
else
    # Linux
    find ./plugins ./packages -maxdepth 2 -name "package.json" -exec sed -i 's/link:\*/\*/g' {} \;
fi
