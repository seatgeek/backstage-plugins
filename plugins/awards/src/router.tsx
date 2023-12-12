import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AwardsListPage } from './components/AwardsListPage';

// TODO: This one is not working because Backstage complains that all routes
// exported here should be wrapped around a Router component, even though
// this all seems to end under an AppRouter component in App.tsx
export const AwardsRouter = () => (
  <Routes>
    {/* awards.routes.root will take the user to this page */}
    <Route path="/" element={<AwardsListPage />} />
  </Routes>
);
