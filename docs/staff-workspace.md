# Staff onboarding and scheduling

Staff Portal now links to `/portal/staff/training` and `/portal/staff/schedule`.

## Access

Shelter Managers and Administrators manage staff training materials, assignments, verification, and shifts. Staff can read published guides and see/respond to their own tasks and shifts. Volunteer Coordinator alone does not grant access to staff personnel tools. An Administrator must grant an active Staff, Shelter Manager, or Administrator role before a person appears in the staff selector. Volunteer applications do not grant staff privileges.

## Airtable storage

- Staff Training Materials: `tblyMvtsiOXCEGrXc`
- Staff Onboarding Tasks: `tblWBcA9SjjNwOFzK`
- Staff Schedule: `tblVFTKBcMRM9OuYv`

Every form saves directly to Airtable through an authenticated server action. Training assignments retain the material ID, version, and content snapshot. Staff completion and manager verification have separate timestamps. A manager cannot verify unfinished training. Managers can return tasks for follow-up.

The six initial guides cover portal access, staff scheduling, Current Needs, events, volunteer onboarding, and a manager checklist for local policies. These are system guides, not clinical protocols or employment policy. Managers should add approved local documents and supervised training appropriate to each role, then assign them.

## Scheduling behavior

Shift times are entered and displayed in America/Chicago and stored as UTC timestamps. Ambiguous or nonexistent DST transition times are rejected. Overlapping scheduled shifts for the same staff member are rejected. Changed dates/times, location, assignee, or status reset the response to Pending. Staff cannot respond to cancelled shifts or submit a response from a stale schedule page. Cancelled records remain visible for clarity. Past shifts are available through the history filter.

No recurring automation, email, or text notification was added. Managers must contact staff directly about assignments and changes. This is shift scheduling and confirmation, not payroll or attendance timekeeping.

## Other changes

The volunteer application now explains clinic scheduling by email with the exception contact numbers. New clinic applications set Scheduling Email Consent true for the existing scheduling workflow; previous preferences are preserved. Clinic role descriptions share one source between the form and opportunities page. The profile avatar is 80 pixels. Current Needs has entry and audience guidance. `/events` now exists and reads all published upcoming events with pagination; homepage remains limited to three.

## Verification

Production build and TypeScript checks pass. Seven focused tests cover role boundaries, DST, conflicts, forbidden manager actions, foreign/stale responses, rescheduling resets, and training verification. Run `node --test scripts/test-staff-workspace.mjs`.

Before assigning real work, perform a signed-in pilot with one staff account and one manager account: assign a guide, complete and verify it; create a real shift, confirm it, change its time, and verify that it needs renewed confirmation. No real staff records were approved or shifts created during implementation.
