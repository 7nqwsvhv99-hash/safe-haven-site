"use strict"

/** @typedef {{[key: string]: unknown}} AnnouncementFields */

function isValidAnnouncementWindow(startValue, expiresValue = "") {
  const start = Date.parse(typeof startValue === "string" ? startValue : "")
  if (!Number.isFinite(start)) return false
  if (!expiresValue) return true
  const expires = Date.parse(typeof expiresValue === "string" ? expiresValue : "")
  return Number.isFinite(expires) && expires > start
}

/** @param {AnnouncementFields} fields */
function isPublicAnnouncementActive(fields, now = Date.now()) {
  if (fields.Status !== "Published") return false
  const start = Date.parse(typeof fields["Display Start"] === "string" ? fields["Display Start"] : "")
  if (!Number.isFinite(start) || start > now) return false
  const expiresValue = typeof fields["Expires At"] === "string" ? fields["Expires At"] : ""
  if (!expiresValue) return true
  const expires = Date.parse(expiresValue)
  return Number.isFinite(expires) && expires > now
}

/** @param {AnnouncementFields} fields */
function getAnnouncementState(fields, now = Date.now()) {
  const status = typeof fields.Status === "string" ? fields.Status : "Draft"
  if (status !== "Published") return status
  const start = Date.parse(typeof fields["Display Start"] === "string" ? fields["Display Start"] : "")
  if (!Number.isFinite(start)) return "Needs schedule"
  if (start > now) return "Scheduled"
  const expiresValue = typeof fields["Expires At"] === "string" ? fields["Expires At"] : ""
  if (expiresValue) {
    const expires = Date.parse(expiresValue)
    if (!Number.isFinite(expires)) return "Needs attention"
    if (expires <= now) return "Expired"
  }
  return "Published"
}

/** @param {{id: string, fields: AnnouncementFields}} record */
function toPublicAnnouncement(record, now = Date.now()) {
  const fields = record.fields
  const title = typeof fields.Title === "string" ? fields.Title : ""
  const message = typeof fields["Public Message"] === "string" ? fields["Public Message"] : ""
  if (!title || !message || !isPublicAnnouncementActive(fields, now)) return null
  return {
    id: record.id,
    title,
    type: typeof fields["Notice Type"] === "string" ? fields["Notice Type"] : "",
    message,
    displayStart: typeof fields["Display Start"] === "string" ? fields["Display Start"] : "",
    expiresAt: typeof fields["Expires At"] === "string" ? fields["Expires At"] : "",
    priority: typeof fields.Priority === "string" ? fields.Priority : "Normal",
  }
}

function comparePublicAnnouncements(a, b) {
  const priority = { Urgent: 0, High: 1, Normal: 2 }
  return (priority[a.priority] ?? 3) - (priority[b.priority] ?? 3) ||
    Date.parse(b.displayStart) - Date.parse(a.displayStart) ||
    a.title.localeCompare(b.title)
}

/** @param {{isAdministrator?: boolean, roles?: string[]}} context */
function canManagePublicContent(context) {
  const roles = Array.isArray(context.roles) ? context.roles : []
  return Boolean(context.isAdministrator) || roles.includes("Shelter Manager") || roles.includes("Executive Director")
}

module.exports = { canManagePublicContent, comparePublicAnnouncements, getAnnouncementState, isPublicAnnouncementActive, isValidAnnouncementWindow, toPublicAnnouncement }
