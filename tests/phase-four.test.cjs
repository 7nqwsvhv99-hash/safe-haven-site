const test = require("node:test")
const assert = require("node:assert/strict")
const {
  canManagePublicContent,
  comparePublicAnnouncements,
  getAnnouncementState,
  isPublicAnnouncementActive,
  isValidAnnouncementWindow,
  toPublicAnnouncement,
} = require("../src/lib/announcement-policy")

const now = Date.parse("2026-11-26T18:00:00.000Z")
const fields = (overrides = {}) => ({
  Title: "Holiday hours",
  "Notice Type": "Holiday Closure",
  "Public Message": "The shelter will be closed.",
  Status: "Published",
  "Display Start": "2026-11-26T18:00:00.000Z",
  "Expires At": "",
  Priority: "High",
  ...overrides,
})

test("announcement lifecycle starts at display time and expires at the exact boundary", () => {
  assert.equal(isPublicAnnouncementActive(fields(), now), true)
  assert.equal(getAnnouncementState(fields(), now), "Published")
  assert.equal(isPublicAnnouncementActive(fields({ "Display Start": "2026-11-26T18:00:01.000Z" }), now), false)
  assert.equal(getAnnouncementState(fields({ "Display Start": "2026-11-26T18:00:01.000Z" }), now), "Scheduled")
  assert.equal(isPublicAnnouncementActive(fields({ "Expires At": "2026-11-26T18:00:00.000Z" }), now), false)
  assert.equal(getAnnouncementState(fields({ "Expires At": "2026-11-26T18:00:00.000Z" }), now), "Expired")
})

test("draft, cancelled, and unpublished notices never enter the public feed", () => {
  for (const Status of ["Draft", "Cancelled", "Unpublished"]) {
    assert.equal(isPublicAnnouncementActive(fields({ Status }), now), false)
  }
})

test("announcement windows require valid dates and a later optional expiration", () => {
  assert.equal(isValidAnnouncementWindow("2026-11-26T18:00:00.000Z"), true)
  assert.equal(isValidAnnouncementWindow("invalid"), false)
  assert.equal(isValidAnnouncementWindow("2026-11-26T18:00:00.000Z", "2026-11-26T18:00:00.000Z"), false)
  assert.equal(isValidAnnouncementWindow("2026-11-26T18:00:00.000Z", "2026-11-26T18:01:00.000Z"), true)
})

test("only authorized content leaders can publish", () => {
  assert.equal(canManagePublicContent({ isAdministrator: true, roles: [] }), true)
  assert.equal(canManagePublicContent({ roles: ["Executive Director"] }), true)
  assert.equal(canManagePublicContent({ roles: ["Shelter Manager"] }), true)
  assert.equal(canManagePublicContent({ roles: ["Volunteer Coordinator"] }), false)
  assert.equal(canManagePublicContent({ roles: ["Board"] }), false)
})

test("public serialization excludes audit fields and orders urgent notices first", () => {
  const publicItem = toPublicAnnouncement({
    id: "rec1",
    fields: fields({ "Created By": "private staff identity", "Internal Notes": "staff only" }),
  }, now)
  assert.deepEqual(Object.keys(publicItem).sort(), ["displayStart", "expiresAt", "id", "message", "priority", "title", "type"])
  assert.equal(JSON.stringify(publicItem).includes("private staff identity"), false)
  const items = [
    { title: "Routine", priority: "Normal", displayStart: "2026-11-26T17:00:00Z" },
    { title: "Urgent", priority: "Urgent", displayStart: "2026-11-26T16:00:00Z" },
    { title: "Newer high", priority: "High", displayStart: "2026-11-26T17:30:00Z" },
    { title: "Older high", priority: "High", displayStart: "2026-11-26T17:00:00Z" },
  ]
  assert.deepEqual(items.sort(comparePublicAnnouncements).map((item) => item.title), ["Urgent", "Newer high", "Older high", "Routine"])
})
