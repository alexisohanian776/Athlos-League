import { makeGate } from './gate.js';

export const adminGate = makeGate({
  cookie: 'athlos_admin',
  payload: 'athlos-admin-v1',
  envVar: 'ADMIN_PASSWORD',
});

export const ADMIN_COOKIE = adminGate.cookie;
