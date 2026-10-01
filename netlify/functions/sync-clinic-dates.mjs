import { runClinicDateSync } from './clinic-sync-core.mjs';

export default async () => {
  await runClinicDateSync();
};

export const config = { schedule: '@hourly' };
