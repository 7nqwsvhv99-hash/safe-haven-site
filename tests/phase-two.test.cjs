const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { publishScheduledEvents } = require('../netlify/functions/publish-scheduled-events.mjs');

function loadTypeScript(relativePath, aliases = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const module = { exports: {} };
  const localRequire = (id) => Object.prototype.hasOwnProperty.call(aliases, id) ? aliases[id] : require(id);
  new Function('exports', 'require', 'module', compiled)(module.exports, localRequire, module);
  return module.exports;
}

const dates = loadTypeScript('src/lib/event-dates.ts');
const reservations = loadTypeScript('src/lib/event-reservation-service.ts', {
  '@/lib/event-dates': dates,
  '@/lib/airtable-config': { getSafeHavenAirtableConfig: () => ({ baseId: 'test-base', tables: { eventReservations: 'reservations' } }) },
});

test('event date conversion respects Central daylight and standard time', () => {
  assert.equal(dates.chicagoLocalToIso('2026-07-04T10:00'), '2026-07-04T15:00:00.000Z');
  assert.equal(dates.chicagoLocalToIso('2026-01-04T10:00'), '2026-01-04T16:00:00.000Z');
});

test('event date conversion rejects nonexistent daylight-saving local times', () => {
  assert.throws(() => dates.chicagoLocalToIso('2026-03-08T02:30'), dates.EventDateError);
});

test('all-day event without an end date expires at the end of the start date', () => {
  const range = dates.parseEventDateRange('2026-07-04', '', true);
  assert.equal(range.startIso, '2026-07-04T05:00:00.000Z');
  assert.equal(range.endIso, '2026-07-05T04:59:00.000Z');
});

test('timed event requires a valid end after its start', () => {
  assert.throws(() => dates.parseEventDateRange('2026-07-04T10:00', '', false), dates.EventDateError);
  assert.throws(() => dates.parseEventDateRange('2026-07-04T10:00', '2026-07-04T10:00', false), dates.EventDateError);
});

test('reservation input accepts a valid package selection and trims contact data', () => {
  const result = reservations.validateReservationInput({
    eventId: 'rec12345678901234', requestKey: 'a52e87d1-5bba-44a1-b22d-4a2991c44955',
    lines: [{ optionId: 'rec98765432109876', quantity: 2 }], firstName: ' Brooke ',
    lastName: ' Bernard ', email: 'brooke@example.com', phone: '', guestNames: '', specialRequests: '',
  });
  assert.equal(result.firstName, 'Brooke');
  assert.equal(result.lines[0].quantity, 2);
});

test('reservation input rejects duplicate, malformed, and excessive line selections', () => {
  const base = {
    eventId: 'rec12345678901234', requestKey: 'a52e87d1-5bba-44a1-b22d-4a2991c44955',
    lines: [{ optionId: 'rec98765432109876', quantity: 1 }], firstName: 'Brooke',
    lastName: 'Bernard', email: 'brooke@example.com',
  };
  assert.throws(() => reservations.validateReservationInput({ ...base, email: 'nope' }), reservations.ReservationError);
  assert.throws(() => reservations.validateReservationInput({ ...base, lines: [base.lines[0], base.lines[0]] }), reservations.ReservationError);
  assert.throws(() => reservations.validateReservationInput({ ...base, lines: [{ optionId: base.lines[0].optionId, quantity: 21 }] }), reservations.ReservationError);
});

test('scheduled publisher publishes only due valid draft events', async () => {
  const calls = [];
  const records = [
    { id: 'recDue00000000001', fields: { 'Event Name': 'Due Event', 'Event Status': 'Draft', 'Publish on Website': false, 'Scheduled Publish At': '2026-11-24T10:00:00.000Z', 'Start Date & Time': '2026-12-01T15:00:00.000Z', 'End Date & Time': '2026-12-01T18:00:00.000Z', 'All Day Event': false, 'Volunteers Needed': false } },
    { id: 'recFuture00000001', fields: { 'Event Name': 'Future Event', 'Event Status': 'Draft', 'Publish on Website': false, 'Scheduled Publish At': '2026-11-25T10:00:00.000Z', 'Start Date & Time': '2026-12-02T15:00:00.000Z', 'End Date & Time': '2026-12-02T18:00:00.000Z', 'All Day Event': false } },
    { id: 'recBad00000000001', fields: { 'Event Name': 'Invalid Event', 'Event Status': 'Draft', 'Publish on Website': false, 'Scheduled Publish At': '2026-11-23T10:00:00.000Z', 'Start Date & Time': '2026-12-03T15:00:00.000Z', 'End Date & Time': '', 'All Day Event': false } },
  ];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (options.method === 'PATCH') return { ok: true };
    return { ok: true, json: async () => ({ records }) };
  };
  const result = await publishScheduledEvents({ fetchImpl, token: 'test-token', now: new Date('2026-11-24T12:00:00.000Z'), config: { baseId: 'test-base', tables: { events: 'events', volunteerShifts: 'shifts' } } });
  assert.deepEqual(result, { published: 1 });
  assert.equal(calls.filter((call) => call.options.method === 'PATCH').length, 1);
  assert.match(calls.find((call) => call.options.method === 'PATCH').url, /recDue00000000001$/);
});

test('scheduled publisher respects an all-day event end already recorded at 11:59 PM Central', async () => {
  const calls = [];
  const records = [{ id: 'recExpiredAllDay001', fields: {
    'Event Name': 'Expired All Day Event', 'Event Status': 'Draft', 'Publish on Website': false,
    'Scheduled Publish At': '2026-11-24T10:00:00.000Z', 'Start Date & Time': '2026-11-24T06:00:00.000Z',
    'End Date & Time': '2026-11-25T05:59:00.000Z', 'All Day Event': true, 'Volunteers Needed': false,
  } }];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    return options.method === 'PATCH' ? { ok: true } : { ok: true, json: async () => ({ records }) };
  };
  const result = await publishScheduledEvents({ fetchImpl, token: 'test-token', now: new Date('2026-11-25T06:01:00.000Z'), config: { baseId: 'test-base', tables: { events: 'events', volunteerShifts: 'shifts' } } });
  assert.deepEqual(result, { published: 0 });
  assert.equal(calls.some((call) => call.options.method === 'PATCH'), false);
});
