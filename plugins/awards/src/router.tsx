/*
 * Copyright SeatGeek
 * Licensed under the terms of the Apache-2.0 license. See LICENSE file in project root for terms.
 */
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { AwardsEditPage, AwardsNewPage, AwardsViewPage } from './components';
import { AwardsListPage } from './components/AwardsListPage';

export const AwardsRouter = () => (
  <Routes>
    {/* awards.routes.root will take the user to this page */}
    <Route path="/" element={<AwardsListPage />} />
    <Route path="/new" element={<AwardsNewPage />} />
    <Route path="/edit/:uid" element={<AwardsEditPage />} />
    <Route path="/view/:uid" element={<AwardsViewPage />} />
  </Routes>
);
