# Maintainers

## Release

### Tooling

We use [multi-semantic-release](https://github.com/qiwi/multi-semantic-release) to automate release of the many (sometimes interdependent) plugins in this repo. It is a wrapper on top of [semantic-release](https://semantic-release.gitbook.io/semantic-release/) that extends `semantic-release` to work for monorepos.

### Configuration

Configuration is kept in [package.json](/package.json)'s `"release"` field and follows the [semantic-release configuration](https://semantic-release.gitbook.io/semantic-release/usage/configuration).

### Workflow

On all pushes to `main` we run `multi-semantic-release --dry-run` in CI to see what would be released.

To actually run a release, trigger the Release workflow.

### Merging

To work with our release tooling, when merging a PR, make sure to:
- Squash into one commit
- Write a commit message that follows [conventionalcommits](https://www.conventionalcommits.org/en/v1.0.0/#summary)

See [this note](https://github.com/semantic-release/semantic-release/discussions/2275#discussioncomment-1719271) for context on why we squash rather than enforce commit message contributions from contributors.

### Future

*`multi-semantic-release` is, by the maintainers' own admission, a hack on top of [semantic-release](https://github.com/semantic-release/semantic-release), but seems to serve its purpose well now, and is used by [other Backstage plugin providers](https://github.com/janus-idp/backstage-plugins/blob/e6ba8e3c5f38381e5e1e74ebd3dac8f20567cc76/package.json#L54) (though we opt for a more up to date fork.) It does a better job than any current alternate option, and explains its advantage well [here](https://github.com/dhoulb/multi-semantic-release?tab=readme-ov-file#iteration-vs-coordination). The maintainers are migrating to their own [tool](https://github.com/semrel-extra/zx-bulk-release) which is in early dev now but is worth exploring in the future.*

