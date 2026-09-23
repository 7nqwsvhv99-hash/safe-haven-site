# Volunteer onboarding

Open Staff Portal → Volunteer Onboarding at `/portal/staff/onboarding`.

Only active accounts assigned Volunteer Coordinator, Shelter Manager, or Administrator may load the workspace or submit its actions. A general Staff, Medical, Clinic Team, Foster, or Volunteer role does not grant onboarding access. Administrators assign the two new roles through Portal Access. The administrator role editor supports adding these select choices through Airtable typecasting when a role is first assigned. No person has been assigned a new privileged role automatically.

Coordinator-only accounts see the Staff Portal entry and are routed directly to onboarding, without access to unrelated Staff or Medical tools. Existing Staff accounts see the onboarding link only if separately authorized. General Staff portal data no longer includes application summaries.

## Process

1. Find an application by name, email, or completion state.
2. Read contact details, emergency contact, availability, experience, and requested clinic role. Set review status, notes, follow-up date, and explicit existing volunteer/clinic links where necessary. Approve the clinic role and verified skills. Professional roles require recorded credential verification. Record orientation completion.
3. Use Safe Haven's approved waiver and upload the signed PDF, PNG, or JPG (up to 5 MB). Record signer and signing date and attest that the document, including guardian requirements if applicable, was reviewed. The upload records an already signed agreement; it is not an electronic signature service and does not generate legal waiver text.
4. Save the review before completing onboarding. The completion action rechecks all requirements server-side, rejects ambiguous record matches, creates or updates the volunteer and clinic profiles, links them to the application, and grants only Volunteer and, where appropriate, Clinic Team access. Existing unrelated access roles are preserved. The coordinator cannot grant privileged roles from this workspace.
5. The application records completion and the latest reviewer/time. Signed evidence stays attached to that application. Apply the revised **Document Workflow - Volunteer Waiver** automation so the signed copy also updates Documents & Agreements. This replaces its old draft-only creation logic and consumes no additional automation slot.

Application submission does not itself grant onboarding privileges. Staff credential verification remains a human responsibility. Portal access changes and waiver upload have not been exercised with live volunteer records during development; use the agreed pilot before broad onboarding.

## Staffing follow-up and background sync

The editable staffing checkbox is now **Booked Appointment Follow-Up Required**. A formula with the former Patient Follow-Up Required name remains solely for compatibility with already-published scripts. New source code uses the clearer name.

The Netlify sync is scheduled at minute 15 every six hours (00:15, 06:15, 12:15, 18:15 UTC). It skips unchanged fields and does not write a fresh Last ClinicDay Sync timestamp by itself. A run with no changes performs no Airtable writes, reducing downstream automation triggers. The sync still requires `CLINIC_SCHEDULING_V2_ENABLED=true`; this release does not enable it.

Place a ClinicDay date on Scheduling Hold immediately when changing or cancelling it. Do not wait up to six hours for background synchronization to stop bookings. Booked animals are never automatically moved by the onboarding workflow.

Turn off **ClinicDay Dates → Clinic Staffing** and **ClinicDay Date Changes → Clinic Staffing**. They have been replaced by the canonical Netlify sync. Keep the retired automations until the launch pilot has passed; then they can be deleted. Disabled automations still count toward the per-base automation-definition limit, but do not consume scheduled runs.

An hourly Airtable automation is 720 runs in a 30-day month (744 in 31 days) before downstream triggers. Netlify scheduling itself is not an Airtable automation run. Updates made by the sync and resulting Airtable notifications can consume runs. A 25,000-run workspace with current usage of 4,500–5,500 has 19,500–20,500 runs of headroom before additional workflows. Continue monitoring actual usage rather than estimating only from clock schedules.

## Validation

Four onboarding policy/guard checks and ten scheduling/reminder tests pass, including denial for general Staff, limited grants, preservation of existing roles, latest responses, cancellation, rescheduling, and zero writes for unchanged synchronization. Type checking and the production build pass. Live role assignment, attachment upload, and a complete real-person onboarding pilot remain launch checks.
