# @seatgeek/plugin-awards

This plugin offers a management system for awards that can be created and given
to recipients in your Backstage deployment, and then displayed onto their
Entity profile pages.

The plugin offers a set of Page Components and an Information card to achieve
this. It also requires the installation of its dependency 
`@seatgeek/plugin-awards-backend`.

Both the backend and the frontend rely on
[Backstage authentication](https://backstage.io/docs/auth/) in order to enforce
ownership of awards. Please follow the documentation to enable authentication
before attempting to use this plugin!

## Installation

### Install the package

Install the `@seatgeek/plugin-awards` package in your frontend app package:

```shell
# From your Backstage root directory
yarn add --cwd packages/app @seatgeek/plugin-awards
```

### Add routes for the plugin management pages

Open the file `packages/app/src/App.tsx` in your Backstage deployment and add
the following lines:

```tsx
// other imports
import { 
  AwardsListPage, 
  AwardsEditPage,
  AwardsNewPage,
  AwardsViewPage,
} from '@seatgeek/plugin-awards';

// Add the routes for the plugin pages before the <FlatRoutes> block is closed.
<FlatRoutes>
// Many routes
    <Route path="/awards/" element={<AwardsListPage />} />
    <Route path="/awards/new" element={<AwardsNewPage />} />
    <Route path="/awards/edit/:uid" element={<AwardsEditPage />} />
    <Route path="/awards/view/:uid" element={<AwardsViewPage />} />
</FlatRoutes>

// Rest of the file
```

### Add the Entity Info Card for Awards

Inside the file `packages/app/src/components/catalog/EntityPage.tsx` file in
your Backstage deployment, add the following items:

```tsx
import { UserAwardsCard } from '@seatgeek/plugin-awards';

// Look for the const userPage and add the card to the Grid
const userPage = (
  <EntityLayout>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        {entityWarningContent}
        <Grid item xs={12} md={6}>
          <EntityUserProfileCard variant="gridItem" />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityOwnershipCard
            variant="gridItem"
            entityFilterKind={OWNERSHIP_KINDS}
          />
        </Grid>
        {/* Add this here - BEGIN */}
        <Grid item xs={12} md={6}>
          <UserAwardsCard />
        </Grid>
        {/* Add this here - END */}
      </Grid>
    </EntityLayout.Route>
  </EntityLayout>
);
```

### Add a sidebar entry (recommended)

In the file `packages/app/src/components/Root/Root.tsx` in your Backstage
deployment, add the following code:

```tsx
// Many imports
import EmojiEventsIcon from '@material-ui/icons/EmojiEvents';

export const Root = ({ children }: PropsWithChildren<{}>) => (
  <SidebarPage>
    <NewAnnouncementBanner max={3} />
    <Sidebar>
      <SidebarLogo />
      <SidebarSearch />
      <SidebarDivider />
      <SidebarGroup label="Menu" icon={<MenuIcon />}>
        {/* Global nav, not org-specific */}
        <SidebarItem icon={HomeIcon} to="catalog" text="Home" />
        <SidebarItem icon={ExtensionIcon} to="api-docs" text="APIs" />
        <SidebarItem icon={LibraryBooks} to="docs" text="Docs" />
        <SidebarItem icon={CreateComponentIcon} to="create" text="Create" />
        <SidebarItem icon={DoneAllIcon} to="soundcheck" text="Soundcheck" />
        <SidebarItem icon={AnnouncementIcon} to="/announcements" text="Announcements" />
        {/* End global nav */}
        {/* Add this here - BEGIN */}
        <SidebarItem icon={EmojiEventsIcon} to="awards" text="Awards" />
        <SidebarDivider />
        {/* Add this here - END */}
        {/* Other imports... */}
```

## Developing this plugin

Your plugin has been added to the example app in this repository, meaning you'll be able to access it by running `yarn start` in the root directory, and then navigating to [/awards](http://localhost:3000/awards).

You can also serve the plugin in isolation by running `yarn start` in the plugin directory.
This method of serving the plugin provides quicker iteration speed and a faster startup and hot reloads.
It is only meant for local development, and the setup for it can be found inside the [/dev](./dev) directory.
