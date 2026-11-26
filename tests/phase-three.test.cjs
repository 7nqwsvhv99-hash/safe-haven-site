const test = require("node:test")
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const ts = require("typescript")

function loadTypeScript(relativePath) {
  const filename = path.join(__dirname, "..", relativePath)
  const source = fs.readFileSync(filename, "utf8")
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const loaded = { exports: {} }
  new Function("exports", "require", "module", output)(loaded.exports, require, loaded)
  return loaded.exports
}

const { orderPublicAdoptionStories } = loadTypeScript("src/lib/adoption-story-display.ts")

test("public adoption stories sort newest publication first and retain legacy order", () => {
  const stories = orderPublicAdoptionStories([
    { id: "old", publishedAt: "", displayOrder: 30 },
    { id: "newer", publishedAt: "2026-11-24T10:00:00.000Z", displayOrder: null },
    { id: "older", publishedAt: "2026-11-23T10:00:00.000Z", displayOrder: null },
    { id: "legacy-first", publishedAt: "", displayOrder: 10 },
  ])

  assert.deepEqual(stories.map((story) => story.id), ["newer", "older", "legacy-first", "old"])
})

test("public adoption story feed is capped at 20 without changing stored records", () => {
  const records = Array.from({ length: 25 }, (_, index) => ({
    id: String(index), publishedAt: new Date(Date.UTC(2026, 0, index + 1)).toISOString(), displayOrder: null,
  }))
  const visible = orderPublicAdoptionStories(records)

  assert.equal(visible.length, 20)
  assert.equal(records.length, 25)
  assert.equal(visible[0].id, "24")
})
