// Retired: veterinarians create their own clinic dates and must not receive
// automatic signup invitations for clinic dates established by another vet.
// Keep any legacy automation pointed at this safe no-op until it is disabled.
const cfg = input.config();
if (!cfg.clinicId) return;
