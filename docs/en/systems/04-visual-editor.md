# 04 — Visual Editor

> **Rule prefix:** `VE-` · **Status:** Binding · **Owner:** Frontend
> **Governing document:** [`../00-PROJECT-RULES.md`](../00-PROJECT-RULES.md) · **العربية:** [`../../ar/systems/04-visual-editor.md`](../../ar/systems/04-visual-editor.md)

---

## 0. Purpose and scope

The editor is **the surface on which users judge the entire product**. If it is confusing, slow, or loses a single edit, the customer is lost — however well-built the backend is.

**Governing rule:** the editor is a **thin client in front of a trusted contract**. It holds no business logic, decides no permissions, and writes no unvalidated data. All it does is display, collect edits, and send them to a contract that validates them.

---

## 1. State model

**`VE-001` (MUST):** Editor state is explicitly documented and cleanly separates:

| Layer | What it is | Example |
|---|---|---|
| **Document** | The actual site content (persisted) | pages, sections, theme |
| **Session** | Editing state (not persisted) | selected element, open tab, save status |
| **History** | Command log for undo | last N commands |
| **Server** | Last server-confirmed version | `version`, `updatedAt` |

**`VE-002` (MUST NOT):** Never mix session state into the document. "The selected element" is not part of site content and is never sent on save.

**`VE-003` (MUST):** Every edit is represented as a **command** with a known shape — never as an ad-hoc direct state mutation.

```ts
type EditorCommand =
  | { kind: 'section.updateData';    sectionId: string; patch: Partial<SectionData> }
  | { kind: 'section.changeVariant'; sectionId: string; variant: string }
  | { kind: 'section.reorder';       sectionId: string; toIndex: number }
  | { kind: 'section.duplicate';     sectionId: string }
  | { kind: 'section.toggleVisible'; sectionId: string; visible: boolean }
  | { kind: 'section.delete';        sectionId: string }
  | { kind: 'section.insert';        type: string; variant: string; atIndex: number }
  | { kind: 'theme.updateTokens';    patch: Partial<ThemeTokens> }
  | { kind: 'page.updateMeta';       pageId: string; patch: Partial<PageMeta> };
```

> **Why commands:** undo/redo becomes trivial, incremental saving becomes possible, diagnostic tracing becomes available, and testing becomes direct.

**`VE-004` (MUST):** Every command is **invertible** — either by an inverse command or by a pre-command snapshot.

---

## 2. Preview

**`VE-010` (MUST):** Preview runs in an **iframe or an isolated rendering context**. Never render site components directly inside the dashboard's own DOM tree.

> **Why:** Without isolation, dashboard CSS leaks into the site and vice versa. The user sees a preview that does not match the real site — which destroys trust in the product.

**`VE-011` (MUST):** Preview uses the **same `packages/site-sections` components** the public renderer uses. A "simplified" editor copy is forbidden.

**`VE-012` (MUST):** Communication with the iframe uses `postMessage` with typed messages, and **`origin` is verified** on every inbound message.

**`VE-013` (MUST):** Device preview (desktop/tablet/mobile) changes the **frame width** only. Never claim the preview equals every real browser.

**`VE-014` (MUST):** Preview reflects the **site's** direction and locale (RTL/LTR), not the dashboard's. See [`23-i18n-rtl.md`](23-i18n-rtl.md).

---

## 3. Autosave and concurrency

This is where editor builders most often fail. The rules below prevent **silent loss of edits** — the worst possible bug in a product like this.

**`VE-020` (MUST):** Autosave is **debounced** (600–1500ms after the last edit), with a maximum frequency even during continuous typing.

**`VE-021` (MUST):** Every save request sends the **expected version** (`expectedVersion`).

```http
PATCH /api/v1/websites/{websiteId}/draft
{
  "expectedVersion": 42,
  "commands": [ ... ]
}
```

**`VE-022` (MUST):** The server returns **`409 Conflict`** if the version differs, with enough data to reconcile:

```json
{
  "error": {
    "code": "REVISION_CONFLICT",
    "currentVersion": 45,
    "changedSections": ["sec_01J...", "sec_02K..."],
    "changedBy": { "userId": "usr_...", "at": "2026-09-15T10:12:00Z" }
  }
}
```

**`VE-023` (MUST NOT):** **Silent last-write-wins is forbidden.** Overwriting someone else's edit without their knowledge is data loss, not a "default behaviour".

**`VE-024` (MUST):** On `409`, the UI **must not lose the user's local edits**. It shows a clear conflict state with explicit options (reload / keep my changes / show differences).

**`VE-025` (MUST):** The UI is **optimistic**: the edit appears immediately. On save failure it rolls back visibly with an understandable message — never a silent failure.

**`VE-026` (MUST):** Save status is always visible to the user: `Saved` · `Saving…` · `Couldn't save — retry`.

**`VE-027` (MUST):** On connection loss, the editor keeps edits locally and retries with exponential backoff on recovery. Attempting to leave the page with unsaved edits triggers an **explicit warning**.

**`VE-028` (MUST):** Autosave writes to the **draft revision only**. It must never touch the published revision. See [`06-renderer-publishing.md`](06-renderer-publishing.md).

---

## 4. Undo / redo

**`VE-030` (MUST):** Undo/redo comes from the **client-side command history**, not a server round trip per keystroke.

**`VE-031` (MUST):** History depth **≥ 50 commands**, cleared on page reload (with the behaviour made evident to the user).

**`VE-032` (MUST):** The server stores **periodic draft checkpoints**, allowing a return to an earlier point after the session closes.

**`VE-033` (MUST):** Deletion is undoable within the session. Deleting a section does not immediately destroy its content.

---

## 5. Section commands in the UI

**`VE-040` (MUST):** Commands available on every section: change variant · duplicate · hide/show · delete · settings · move up/down.

**`VE-041` (MUST):** Changing a variant **loses no data** (`CE-004`). If a user changes variant and content disappears, that is an engine bug, not an editor bug.

**`VE-042` (MUST):** Reordering by drag and drop, with a **mandatory keyboard alternative** (up/down buttons or shortcuts). Drag and drop alone is not an acceptable interface.

**`VE-043` (MUST):** Adding a section shows a **variant gallery with preview images** from the registry (`CE-053`), not a textual list of names.

**`VE-044` (MUST):** Hiding is stored in `settings.visibility` and does not delete data.

---

## 6. Text editing and input

**`VE-050` (MUST):** Inline text editing writes **plain text** into the corresponding field. The editor must never produce HTML (`CE-002`).

**`VE-051` (MUST):** Pasting from Word or a web page is **immediately cleaned** to plain text (or the approved structured representation). `<span style=...>` must never leak into the data.

**`VE-052` (MUST):** Schema length limits are enforced in the UI **and shown to the user** (counter or warning) before the server rejects.

> The UI prevents gently; the server rejects firmly. Both are required (`CORE-005`).

**`VE-053` (MUST):** Image uploads from the editor go through the approved asset path: signed upload + background processing. See [`08-assets-media.md`](08-assets-media.md).

**`VE-054` (MUST):** The image `alt` field is **clearly required** in the UI with an explanation of why it matters — not an optional field buried in a panel.

---

## 7. Limits and permissions in the UI

**`VE-060` (MUST):** The UI reads entitlements and disables what the plan does not allow, **with a clear message and an upgrade path** — never a button that silently fails. See [`11-billing-entitlements.md`](11-billing-entitlements.md).

**`VE-061` (MUST NOT):** **Hiding or disabling a button is not protection** (`CORE-004`). The server enforces every limit and permission entirely independently of the UI.

**`VE-062` (MUST):** Usage limits (page count, sections, AI generations) are shown to the user **before** the limit is reached, not after the failure.

---

## 8. Performance and UX

**`VE-070` (MUST):** The editor stays responsive with **≥ 40 sections on one page**. Re-rendering the whole tree on every keystroke is unacceptable.

**`VE-071` (MUST):** Preview updates while typing are **throttled** and do not fully reload the iframe on every character.

**`VE-072` (MUST):** Every primary screen has defined, designed loading, empty, and error states.

**`VE-073` (MUST):** Baseline accessibility: full keyboard navigation, clear labels, correct focus management in modals.

---

## 9. Anti-patterns

| # | Pattern | Why it is dangerous |
|---|---|---|
| 1 | Last-write-wins with no version | Silent loss of the user's work — the worst possible bug |
| 2 | Rendering the site inside the dashboard DOM | CSS leakage and a lying preview |
| 3 | "Simplified" preview components | The preview does not match the result |
| 4 | Autosave touching the published revision | Half-finished edits visible to visitors |
| 5 | Text editing producing HTML | Breaks `CE-002` and opens XSS |
| 6 | Pasting without cleaning | Data polluted with Word styles |
| 7 | Drag and drop as the only method | Excludes keyboard users |
| 8 | Disabling a button as limit enforcement | The API is exposed — one line bypasses it |
| 9 | Silent save failure | The user works an hour and loses it |
| 10 | `postMessage` without `origin` check | Injection vector from another window |

---

## 10. Required tests

**`VE-080` (MUST):** A test per command: it applies the correct effect and undoes correctly.

**`VE-081` (MUST):** Version conflict test: two editors, the first saves, the second receives `409` **and does not lose its local edits**.

**`VE-082` (MUST):** Variant change test per type: no data loss (complements `CE-071`).

**`VE-083` (MUST):** Network test: connection lost mid-save → retry → success, with no duplicated edit and no loss.

**`VE-084` (MUST):** Full E2E path: create → edit text → change variant → upload image → reorder → publish → visit the public site and confirm the edits appear.

**`VE-085` (MUST):** The editor is tested in both RTL and LTR.

---

## 11. Definition of Done — visual editor

- [ ] Every new edit is a typed, invertible command.
- [ ] Session state is separate from the document.
- [ ] Saves send `expectedVersion` and handle `409` without loss.
- [ ] Save status is always visible to the user.
- [ ] Preview is isolated and uses the same `site-sections` components.
- [ ] `postMessage` verifies `origin`.
- [ ] Variant changes lose no data.
- [ ] A keyboard alternative exists for every drag interaction.
- [ ] Limits are clearly shown, and the server enforces them independently.
- [ ] Loading / empty / error states handled.
- [ ] Tested in RTL and LTR, on mobile and desktop.
- [ ] Full E2E path test passes.

---

## 12. What requires an ADR

- Real-time collaborative editing (CRDT / OT).
- Allowing custom HTML, CSS, or JS from the editor.
- Changing the concurrency model (away from optimistic + version).
- Building the editor on components other than `site-sections`.

---

## 13. Cross-references

[`03-content-engine.md`](03-content-engine.md) · [`06-renderer-publishing.md`](06-renderer-publishing.md) draft vs published · [`08-assets-media.md`](08-assets-media.md) · [`11-billing-entitlements.md`](11-billing-entitlements.md) · [`15-api-standards.md`](15-api-standards.md) `409` · [`16-frontend-standards.md`](16-frontend-standards.md) · [`23-i18n-rtl.md`](23-i18n-rtl.md)
