import { makeGate } from './gate.js';

export const vipGate = makeGate({
  cookie: 'athlos_vip',
  payload: 'athlos-vip-v1',
  envVar: 'VIP_PASSWORD',
});

export const VIP_COOKIE = vipGate.cookie;
