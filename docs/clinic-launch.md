# Clinic scheduling activation and launch

Prepared September 23, 2026. This is an activation checklist, not a claim of completed live acceptance testing.

## Application and staff review

Everyone, including veterinarians and vet techs, uses the volunteer application. Select a Clinic Team interest to reveal the clinic questions. The application collects requested role, experience/training, professional credential details, scheduling email consent, and emergency contact in addition to existing contact and availability questions. Professional details should include credential, jurisdiction, number if applicable, and expiration.

Staff must review credentials and actual training, set **Approved Clinic Role** and **Approved Clinic Skills**, and approve the application. For an existing team member whose email is missing, explicitly select their **Clinic Team Member** link before approving to avoid a duplicate profile. The approved-application automation synchronizes the Volunteers and Clinic Team Members records by explicit link or exact email. An application alone does not grant portal access or establish professional credentials. Add/verify Clinic Team permission in Portal Access using the same email. Finish the volunteer waiver/document process separately.

Scheduling consent is for email. Selecting Text or Phone as preferred contact does not enable SMS or phone automations. Emergency and credential details remain on the linked application, rather than being publicly displayed in the portal.

## Activate Airtable drafts

Airtable automation APIs cannot publish changes. An authorized user must click Update in the UI for each existing automation, and turn the new sender On. Enable the queue sender before any producer so queued messages are not left behind.

| Automation | Action |
| --- | --- |
| [Clinic Staffing - Send Queued Notification](https://airtable.com/app2vpch2JJVrP9pu/wflBFIa41YnVKa5Xt) | Turn On |
| [Approved Volunteer → Create Roster Profile](https://airtable.com/app2vpch2JJVrP9pu/wflwL7SZDRQOnKbcD) | Update |
| [Clinic Staffing - Start Veterinarian Round](https://airtable.com/app2vpch2JJVrP9pu/wfly9M0kql22Yg0of) | Update |
| [Clinic Staffing - Advance Sequential Rounds](https://airtable.com/app2vpch2JJVrP9pu/wfloAcTs1oN914E41) | Update |
| [Veterinarian Preference → Vet Tech Round](https://airtable.com/app2vpch2JJVrP9pu/wflojG2FuGpMTyXSu) | Update the additional date-stamping/safety changes in this draft |
| [Clinic Staffing - Email New Invitation](https://airtable.com/app2vpch2JJVrP9pu/wflYToQj7svk47SSR) | Update |
| [Clinic One-Week Reconfirmation Reminder](https://airtable.com/app2vpch2JJVrP9pu/wfldmQB3o4pnbtURD) | Update; now includes catch-up, late signups, unanswered invitations, and deadline escalation |
| [ClinicDay Dates → Clinic Staffing](https://airtable.com/app2vpch2JJVrP9pu/wfljSUcIgwNDgle90) | Update to retire its writer, then turn Off |
| [ClinicDay Date Changes → Clinic Staffing](https://airtable.com/app2vpch2JJVrP9pu/wflDR41AQt0H7L6kx) | Update to retire its writer, then turn Off |

After verifying these live versions, set the Netlify production environment variable `CLINIC_SCHEDULING_V2_ENABLED=true`, including the Functions scope, and redeploy. Until then the new sync deliberately returns a paused result. This prevents the old Airtable sync writers and the new Netlify writer from racing. Confirm the first hourly `sync-clinic-dates` execution succeeds and canonical links remain unique. It runs at minute 15 of each hour, so cross-base edits are not instantaneous. Put ClinicDay on hold immediately when changing or cancelling a clinic; do not wait for the hourly sync to stop bookings.

## Daily operating rules

- Target **six clinic volunteers** for both session types, in addition to veterinarian and vet-tech coverage. Staffed also requires Front Room System, Back Room System, and Autoclave coverage, and no unresolved patient follow-up.
- Full-day Max Capacity is **26**. Existing half-day capacity values are preserved; the existing half-day creation default remains 21. Session type comes from Clinic Type, never inferred from capacity.
- The actual ClinicDay record ID is the canonical cross-base identity. One unique date match is used only to migrate an unlinked or legacy SYNC identifier. Duplicate or conflicting matches require coordinator review rather than guessing.
- Availability and reconfirmation timestamps determine which answer is current. A changed clinic date invalidates the previous date's response. A fresh availability submission clears the old reconfirmation.
- Cancelled and completed dates are excluded from upcoming portal lists. Volunteers may answer No without selecting an assignment. The reader follows all Airtable pages instead of stopping at 500 records.
- The daily 9 AM Central automation catches newly approved members, reminds unanswered invitees after 48 hours, requests missing reconfirmations for every upcoming date within seven days, including late signups, and sends deadline summaries to Rachel and Jen. Newly created invitation rows also use the queue sender. Daily reminders continue until answered or the clinic is no longer upcoming.

## Cancellation and rescheduling with booked patients

1. Immediately set **Scheduling Hold?** on the linked ClinicDay record. For cancellation, set **Clinic Cancelled** in ClinicDay or **Scheduling Stage = Cancelled** in Shelter Management. The worker propagates cancellation and retains patient records.
2. For rescheduling, change the date/session in one base. The worker clears prior staffing commitments and requests fresh availability. If changing the Shelter Management date would move an existing ClinicDay day with booked cases, it leaves that patient-booking date unchanged until review is complete.
3. Rachel and Jen receive a coordinator notification. Review all linked booked cases, contact affected owners/partners, record each outcome in the existing patient workflow, and reconcile individual appointments. The code does not silently move or cancel patients.
4. Clear **Patient Follow-Up Required** only after reconciliation. The sync can then align the ClinicDay date. Release **Scheduling Hold?** only after confirming the patient plan and staffing. Cancelling does not automatically reopen: reconcile both the Clinic Cancelled flag and staffing stage deliberately.
5. Conflicting date/type edits in both bases place booking on hold and produce **Sync Review Notes**. Resolve both records to the intended date/type, clear follow-up after review, and confirm the next sync.

## Pilot and go-live gates

Use designated test participants and a clearly identified pilot date, with patient booking on hold. Verify application submission and approval, existing-person linking, Clinic Team sign-in, vet preference, tech invitation and answer, volunteer role choices including a No answer without a role, all specialist assignments, changed answers, late signup and reconfirmation reminders, cancellation, reschedule and patient follow-up, email delivery and Sent At stamps. Do not manually test email actions against real recipients without coordinating the test.

Confirm notification delivery and run histories in Airtable and Netlify. The sender stamps Sent At only after its email action succeeds. An email sent successfully but followed by a failed stamp can require manual reconciliation to avoid a duplicate send; check run history before retrying. Review unsent queue rows daily during the pilot. Do not activate broad scheduling invitations until the roster, permissions, and pilot are ready. Review existing near-term clinics first because activating daily catch-up will create their missing invitations and may notify real team members.

Automated checks: nine mocked workflow tests cover canonical matching, duplicate rejection, six/26 settings, cancellation, both rescheduling directions, booked-patient preservation, unlinked-date resets, late signups, invitation catch-up, and newer/older reconfirmations. Type checking and a production build pass. These do not verify live email delivery, authenticated role access, or the complete real Airtable workflow.

## Automation budget

Shelter Management has 34 configured automations after adding one queue sender. Airtable permits 50 per base including disabled automations, leaving 16 slots. Retiring the two legacy writers does not free slots unless they are deleted later. Extend shared scripts instead of creating an automation per role or reminder. A second base is unnecessary for these changes. Monthly run limits are shared at the workspace level and depend on the actual plan; check current workspace usage before launch. Another base in the same workspace does not increase that allowance.
