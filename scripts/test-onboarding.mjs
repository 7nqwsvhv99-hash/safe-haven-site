import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import ts from 'typescript';
const source=await fs.readFile(new URL('../src/lib/onboarding-policy.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {canManageOnboarding,onboardingAccess}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('only the three authorized roles can open onboarding',()=>{
 for(const role of ['Volunteer Coordinator','Shelter Manager','Administrator'])assert.equal(canManageOnboarding([role]),true);
 for(const role of ['Staff','Medical','Volunteer','Clinic Team','Foster',''])assert.equal(canManageOnboarding([role]),false);
 assert.equal(canManageOnboarding(['Staff','Medical','Clinic Team']),false);
});
test('onboarding grants only Volunteer and eligible Clinic Team access',()=>{
 assert.deepEqual(onboardingAccess([],''),['Volunteer']);
 assert.deepEqual(onboardingAccess([],'Vet Tech'),['Volunteer','Clinic Team']);
 assert.deepEqual(onboardingAccess([],'Administrator'),['Volunteer']);
 assert.deepEqual(onboardingAccess(['Foster'],'Clinic Volunteer'),['Foster','Volunteer','Clinic Team']);
});
test('existing roles are preserved and grants are idempotent',()=>{
 assert.deepEqual(onboardingAccess(['Staff','Volunteer'],'Veterinarian'),['Staff','Volunteer','Clinic Team']);
 const once=onboardingAccess([],'Veterinarian');assert.deepEqual(onboardingAccess(once,'Veterinarian'),once);
});
test('every mutation uses the guarded executor',async()=>{
 const actions=await fs.readFile(new URL('../src/app/portal/staff/onboarding/actions.ts',import.meta.url),'utf8');
 assert.match(actions,/const context=await requireOnboarding\(\)/);
 for(const name of ['saveReview','saveWaiver','completeOnboarding'])assert.match(actions,new RegExp('export async function '+name+'\\(form:FormData\\) \\{\\s+await execute'));
});
