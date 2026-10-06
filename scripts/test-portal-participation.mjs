import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
async function load(path) {
  const source = await fs.readFile(new URL(path, import.meta.url), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  return import('data:text/javascript;base64,' + Buffer.from(js).toString('base64'));
}
const { hasGeneralVolunteerParticipation, splitSubmittedDates, isAssignedVeterinarian } = await load('../src/lib/portal-participation.ts');
const { onboardingAccess } = await load('../src/lib/onboarding-policy.ts');
test('clinic-only veterinarian and volunteer profiles do not grant shelter volunteering', () => {
  for (const interest of ['Clinic Team - Veterinarian', 'Clinic Team – Front Room', 'Clinic Team - General Volunteer']) {
    assert.equal(hasGeneralVolunteerParticipation('Volunteer Interests: ' + interest, ['Clinic']), false);
  }
  assert.equal(hasGeneralVolunteerParticipation('', []), false);
  assert.deepEqual(onboardingAccess(['Volunteer', 'Medical'], 'Veterinarian', false), ['Medical', 'Clinic Team']);
});
test('mixed interests and approved shelter opportunities retain general volunteering', () => {
  assert.equal(hasGeneralVolunteerParticipation('Volunteer Interests: Clinic Team - Veterinarian, Cat Socializing & Enrichment', ['Clinic']), true);
  assert.equal(hasGeneralVolunteerParticipation('', ['Clinic', 'Shelter Care']), true);
  assert.equal(hasGeneralVolunteerParticipation('Volunteer Interests: Events & Fundraising', []), true);
  assert.deepEqual(onboardingAccess(['Foster'], 'Clinic Volunteer', true), ['Foster', 'Volunteer', 'Clinic Team']);
});
test('today stays upcoming and history sorts newest first without changing original records', () => {
  const records = [{preferredDate:'2026-09-26'}, {preferredDate:'2026-08-01'}, {preferredDate:'2026-10-06'}, {preferredDate:'2026-11-07'}, {preferredDate:''}];
  const result = splitSubmittedDates(records, '2026-10-06');
  assert.deepEqual(result.upcoming.map(r => r.preferredDate), ['2026-10-06', '2026-11-07']);
  assert.deepEqual(result.past.map(r => r.preferredDate), ['2026-09-26', '2026-08-01']);
  assert.equal(records.length, 5);
});
test('veterinarian reconfirmation belongs to an assigned clinic, not a blanket invitation', () => {
  assert.equal(isAssignedVeterinarian('Veterinarian', 'Veterinarian', 'Yes'), true);
  assert.equal(isAssignedVeterinarian('Veterinarian', '', 'No Response'), false);
  assert.equal(isAssignedVeterinarian('Veterinarian', 'Veterinarian', 'No'), false);
  assert.equal(isAssignedVeterinarian('Clinic Volunteer', 'Veterinarian', 'Yes'), false);
});
