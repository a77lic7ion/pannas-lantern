export type LanternTab =
  | "today"
  | "notebooks"
  | "novel"
  | "poems"
  | "blog"
  | "notes"
  | "wellbeing"
  | "settings";

export type SavedTestNote = {
  id: string;
  title: string;
  body: string;
  savedAt: number;
};

export type SavedTestItem = {
  title: string;
  body: string;
  savedAt: number;
};

export type SavedSoul = { body: string; savedAt: number };

export type WellbeingCheckin = {
  id: string;
  date: string;
  mood: string;
  energy: string;
  comforts: string[];
  note: string;
  savedAt: number;
};

export type WellbeingMedication = {
  id: string;
  name: string;
  reminder: string;
  note: string;
  savedAt: number;
};

export type WellbeingAppointmentNote = {
  changed: string;
  helped: string;
  questions: string;
  savedAt: number;
};

export type WellbeingReportRange = "week" | "month";

export function wellbeingReportItems(items: WellbeingCheckin[], range: WellbeingReportRange, today = new Date()) {
  const start = new Date(today);
  start.setDate(today.getDate() - (range === "week" ? 6 : 29));
  const startKey = start.toISOString().slice(0, 10);
  const endKey = today.toISOString().slice(0, 10);
  return items.filter(item => item.date >= startKey && item.date <= endKey);
}

export type SavedTestCollections = Partial<Record<LanternTab, SavedTestItem[]>>;

export type WritingCollectionKind = "novel" | "blog" | "poems";

export type WritingCollection = {
  id: string;
  kind: WritingCollectionKind;
  title: string;
  description: string;
  items: SavedTestItem[];
  createdAt: number;
  updatedAt: number;
};

export function selectedWritingAssistantContext(collections: WritingCollection[], kind: WritingCollectionKind | null, selectedId?: string) {
  if (!kind) return null;
  const selected = collections.find(item => item.kind === kind && item.id === selectedId) ?? collections.find(item => item.kind === kind);
  if (!selected) return null;
  return { id: selected.id, kind: selected.kind, title: selected.title, description: selected.description, childEntries: selected.items.map(item => ({ title: item.title, body: item.body, savedAt: item.savedAt })) };
}

export type SavedTestNotebook = {
  id: string;
  title: string;
  description: string;
  sources: SavedTestItem[];
  documents: SavedTestItem[];
  notes: string;
  createdAt: number;
  updatedAt: number;
};

import { type ProviderKind } from "@shared/providerConfig";

export type SavedProviderPreference = {
  id: string;
  kind: ProviderKind;
  label: string;
  model: string;
  endpoint: string;
  apiKey?: string;
  savedAt: number;
};

const TEST_NOTE_KEY = "pannas-lantern:test-note";
const TEST_COLLECTIONS_KEY = "pannas-lantern:test-collections";
const WRITING_COLLECTIONS_KEY = "pannas-lantern:writing-collections";
const TEST_NOTEBOOKS_KEY = "pannas-lantern:test-notebooks";
const PROVIDER_PREFERENCES_KEY = "pannas-lantern:provider-preferences";
const SOUL_KEY = "pannas-lantern:soul-md";
const WELLBEING_CHECKINS_KEY = "pannas-lantern:wellbeing-checkins";
const WELLBEING_MEDICATIONS_KEY = "pannas-lantern:wellbeing-medications";
const WELLBEING_APPOINTMENT_KEY = "pannas-lantern:wellbeing-appointment";

const LEGACY_NOTE_TITLE = "Ideas for the book";
const LEGACY_NOTE_BODY =
  "Meaning is not found, but tended—like a garden.\n\nGardens mirror the soul. What we cultivate within comes out in the world.\n\nMemory is a lantern. It does not erase the dark, but helps us find our way through it.";
const LEGACY_NOTEBOOK_TITLE = "Meaning and Logotherapy";
const LEGACY_NOTEBOOK_DESCRIPTION = "A place for sources, questions, and presentation ideas.";

function emptyNote(): SavedTestNote {
  return { id: "", title: "", body: "", savedAt: 0 };
}

function newNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Notes are stored as a list so each note is kept, never overwritten.
export function loadTestNotes(): SavedTestNote[] {
  try {
    const raw = localStorage.getItem("pannas-lantern:test-notes");
    if (raw) return JSON.parse(raw) as SavedTestNote[];
  } catch {
    // A private browsing mode may block browser storage. The session remains usable.
  }
  // Migrate a single legacy note into the list.
  try {
    const raw = localStorage.getItem(TEST_NOTE_KEY);
    if (raw) {
      const note = JSON.parse(raw) as SavedTestNote;
      if (!isLegacySeedNote(note)) return [{ ...note, id: note.id || newNoteId() }];
    }
  } catch {
    // An unavailable store keeps the session usable.
  }
  return [];
}

export function saveTestNotes(notes: SavedTestNote[]) {
  try {
    localStorage.setItem("pannas-lantern:test-notes", JSON.stringify(notes));
  } catch {
    // The app retains notes in memory when storage is unavailable.
  }
}

function isLegacySeedNote(note: SavedTestNote): boolean {
  return note.title === LEGACY_NOTE_TITLE && note.body === LEGACY_NOTE_BODY;
}

function isLegacySeedNotebook(notebook: SavedTestNotebook): boolean {
  return (
    notebook.title === LEGACY_NOTEBOOK_TITLE &&
    notebook.description === LEGACY_NOTEBOOK_DESCRIPTION &&
    notebook.sources.length === 0
  );
}

export function loadTestNote(): SavedTestNote {
  const notes = loadTestNotes();
  if (notes.length) return notes[notes.length - 1];
  return emptyNote();
}

export function saveTestNote(note: SavedTestNote): SavedTestNote {
  const next = [...loadTestNotes().filter(item => item.id !== note.id), { ...note, id: note.id || newNoteId(), savedAt: note.savedAt || Date.now() }];
  saveTestNotes(next);
  return next[next.length - 1];
}

export function clearTestNote() {
  try { localStorage.removeItem(TEST_NOTE_KEY); } catch { /* session remains usable */ }
}

export function deleteTestNote(id: string): SavedTestNote[] {
  const next = loadTestNotes().filter(item => item.id !== id);
  saveTestNotes(next);
  return next;
}

export function loadSoul(): SavedSoul {
  try {
    const raw = localStorage.getItem(SOUL_KEY);
    return raw ? JSON.parse(raw) as SavedSoul : { body: "", savedAt: 0 };
  } catch { return { body: "", savedAt: 0 }; }
}

export function saveSoul(soul: SavedSoul) {
  try { localStorage.setItem(SOUL_KEY, JSON.stringify(soul)); } catch { /* session remains usable */ }
}

export function clearSoul() {
  try { localStorage.removeItem(SOUL_KEY); } catch { /* session remains usable */ }
}

export function loadTestCollections(): SavedTestCollections {
  try {
    const raw = localStorage.getItem(TEST_COLLECTIONS_KEY);
    if (raw) return JSON.parse(raw) as SavedTestCollections;
  } catch {
    // A private browsing mode may block browser storage. The session remains usable.
  }

  return {};
}

export function saveTestCollections(collections: SavedTestCollections) {
  try {
    localStorage.setItem(TEST_COLLECTIONS_KEY, JSON.stringify(collections));
  } catch {
    // The app retains the current test additions in memory when browser storage is unavailable.
  }
}

export function loadWritingCollections(legacyCollections: SavedTestCollections = {}): WritingCollection[] {
  try {
    const raw = localStorage.getItem(WRITING_COLLECTIONS_KEY);
    if (raw) return JSON.parse(raw) as WritingCollection[];
  } catch {
    // The writing workspace remains usable in memory when browser storage is unavailable.
  }
  const migrated = (Object.entries(legacyCollections) as [string, SavedTestItem[]][])
    .filter(([kind, items]) => ["novel", "blog", "poems"].includes(kind) && items.length)
    .map(([kind, items]) => {
      const timestamp = Date.now();
      const label = kind === "novel" ? "Imported novel entries" : kind === "blog" ? "Imported blog archive" : "Imported poems";
      return { id: `writing-${kind}-${timestamp}`, kind: kind as WritingCollectionKind, title: label, description: "Migrated from earlier local entries.", items, createdAt: timestamp, updatedAt: timestamp };
    });
  return migrated;
}

export function saveWritingCollections(collections: WritingCollection[]) {
  try { localStorage.setItem(WRITING_COLLECTIONS_KEY, JSON.stringify(collections)); } catch { /* session remains usable */ }
}

let writingCollectionSequence = 0;

export function createWritingCollection(kind: WritingCollectionKind, title: string, description: string, firstItem?: SavedTestItem): WritingCollection {
  const timestamp = Date.now();
  const id = `writing-${kind}-${timestamp}-${writingCollectionSequence++}`;
  return { id, kind, title: title.trim() || `Untitled ${kind}`, description: description.trim(), items: firstItem ? [firstItem] : [], createdAt: timestamp, updatedAt: timestamp };
}

export function addItemToWritingCollection(collection: WritingCollection, item: SavedTestItem): WritingCollection {
  return { ...collection, items: [...collection.items, item], updatedAt: Date.now() };
}

export function updateWritingCollection(collection: WritingCollection, title: string, description: string): WritingCollection {
  return { ...collection, title: title.trim() || collection.title, description, updatedAt: Date.now() };
}

export function updateWritingItemInCollection(collection: WritingCollection, savedAt: number, title: string, body: string): WritingCollection {
  return { ...collection, items: collection.items.map(item => item.savedAt === savedAt ? { ...item, title, body, savedAt } : item), updatedAt: Date.now() };
}

export function removeItemFromWritingCollection(collection: WritingCollection, savedAt: number): WritingCollection {
  return { ...collection, items: removeTestItem(collection.items, savedAt), updatedAt: Date.now() };
}

export function createTestItem(title: string, body: string): SavedTestItem {
  return {
    title: title.trim() || "Untitled entry",
    body: body.trim(),
    savedAt: Date.now(),
  };
}

export function loadTestNotebooks(): SavedTestNotebook[] {
  try {
    const raw = localStorage.getItem(TEST_NOTEBOOKS_KEY);
    if (raw) {
      const notebooks = JSON.parse(raw) as SavedTestNotebook[];
      return notebooks.filter(notebook => !isLegacySeedNotebook(notebook));
    }
  } catch {
    // Browser storage is optional for the test workspace.
  }

  return [];
}

export function saveTestNotebooks(notebooks: SavedTestNotebook[]) {
  try {
    localStorage.setItem(TEST_NOTEBOOKS_KEY, JSON.stringify(notebooks));
  } catch {
    // The app retains notebook changes for the current session when storage is unavailable.
  }
}

export function createTestNotebook(title: string, description: string): SavedTestNotebook {
  const timestamp = Date.now();
  return {
    id: `notebook-${timestamp}`,
    title: title.trim() || "Untitled notebook",
    description: description.trim(),
    sources: [],
    documents: [],
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function addSourceToTestNotebook(notebook: SavedTestNotebook, source: SavedTestItem): SavedTestNotebook {
  return {
    ...notebook,
    sources: [...notebook.sources, source],
    updatedAt: Date.now(),
  };
}

export function removeTestItem(items: SavedTestItem[], savedAt: number) {
  return items.filter(item => item.savedAt !== savedAt);
}

export function removeSourceFromTestNotebook(notebook: SavedTestNotebook, savedAt: number): SavedTestNotebook {
  return { ...notebook, sources: removeTestItem(notebook.sources, savedAt), updatedAt: Date.now() };
}

export function updateTestNotebookNotes(notebook: SavedTestNotebook, notes: string): SavedTestNotebook {
  return { ...notebook, notes, updatedAt: Date.now() };
}

const CHAT_SESSIONS_KEY = "pannas-lantern:chat-sessions";

export type ChatSessionEntry = { role: "user" | "assistant"; content: string };

export function loadChatSessions(): Record<string, ChatSessionEntry[]> {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, Array<{ role?: string; content?: string }>>;
    const out: Record<string, ChatSessionEntry[]> = {};
    for (const [tab, entries] of Object.entries(parsed)) {
      if (Array.isArray(entries)) {
        out[tab] = entries.filter((entry): entry is ChatSessionEntry =>
          (entry?.role === "user" || entry?.role === "assistant") && typeof entry?.content === "string"
        );
      }
    }
    return out;
  } catch {
    // The workspace remains usable if private browsing blocks browser storage.
    return {};
  }
}

export function saveChatSessions(sessions: Record<string, Array<{ role: string; content: string }>>) {
  try { localStorage.setItem(CHAT_SESSIONS_KEY, JSON.stringify(sessions)); } catch { /* same */ }
}

export function loadProviderPreferences(): SavedProviderPreference[] {
  try {
    const raw = localStorage.getItem(PROVIDER_PREFERENCES_KEY);
    if (raw) return JSON.parse(raw) as SavedProviderPreference[];
  } catch {
    // The workspace remains usable if private browsing blocks browser storage.
  }

  return [];
}

export function saveProviderPreferences(preferences: SavedProviderPreference[]) {
  try {
    localStorage.setItem(PROVIDER_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch {
    // Keep preferences in the active session if browser storage is unavailable.
  }
}

export function createProviderPreference(
  input: Pick<SavedProviderPreference, "kind" | "label" | "model" | "endpoint" | "apiKey">
): SavedProviderPreference {
  const savedAt = Date.now();
  return {
    id: `provider-${savedAt}`,
    kind: input.kind,
    label: input.label.trim() || input.kind,
    model: input.model.trim(),
    endpoint: input.endpoint.trim(),
    apiKey: input.apiKey?.trim() || undefined,
    savedAt,
  };
}

export function activeProvider(preferences: SavedProviderPreference[]): SavedProviderPreference | null {
  return preferences[0] ?? null;
}

export function removeProviderPreference(preferences: SavedProviderPreference[], id: string) {
  return preferences.filter(preference => preference.id !== id);
}

export const tabAssistantCopy: Record<LanternTab, string> = {
  today: "When you add something, I can help you decide on a calm next step.",
  notebooks: "Create a notebook when you are ready to gather sources and questions in one place.",

  novel: "Begin with a chapter title, an idea, or a single paragraph—nothing more is required.",
  poems: "Bring in poems when you are ready; originals will remain untouched while you organize them.",
  blog: "Import an original blog file when you want to preserve and revisit earlier writing.",
  notes: "Capture the thought first. You can decide what it becomes later.",
  settings: "Settings remain deliberately simple while you begin using the workspace.",
  wellbeing: "A gentle place to notice how you are arriving today, without judgment or pressure.",
};


export const WELLBEING_MOODS = ["Steady", "Tender", "Worried", "Low", "Overwhelmed"] as const;
export const WELLBEING_ENERGY = ["Resting", "A little energy", "Steady"] as const;
export const WELLBEING_COMFORTS = ["Sleep", "Appetite", "Tension", "Pain", "Other"] as const;
export const WELLBEING_SAFETY_NOTE = "This is a private reflection tool, not medical advice or urgent support. For new, severe, or worrying symptoms, contact a qualified clinician or local urgent support.";

const affirmationOpeners = [
  "Today, your presence matters",
  "You are allowed to move gently",
  "Your story still has room",
  "A quiet beginning is still a beginning",
  "You deserve patience from yourself",
  "Your care for others is meaningful",
  "Rest is part of a life well lived",
  "You can make room for one small hope",
  "Your feelings may be heard without taking over",
  "There is no age limit on new tenderness",
  "You have made it through difficult days",
  "Your wisdom does not need to shout",
  "A softer pace can still carry you forward",
  "You are more than the work waiting for you",
  "Your kindness includes kindness toward yourself",
];

const affirmationEndings = [
  "and you do not have to prove your worth.",
  "and one small step is enough for now.",
  "and you may pause before you decide what comes next.",
  "and the day does not need to be perfect to be precious.",
  "and you can ask for help without losing your strength.",
  "and your needs belong in the room too.",
  "and being here is already something real.",
  "and you can begin again as many times as you need.",
  "and there is room for both courage and weariness.",
  "and you are worthy on the quiet days as well.",
];

export const dailyAffirmations = affirmationOpeners.flatMap(opener => affirmationEndings.map(ending => `${opener}; ${ending}`));

export function affirmationForDate(date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return dailyAffirmations[((dayNumber % dailyAffirmations.length) + dailyAffirmations.length) % dailyAffirmations.length];
}

const SPLASH_AFFIRMATION_INDEX_KEY = "pannas-lantern:splash-affirmation-index";

export function nextSplashAffirmation() {
  if (typeof sessionStorage === "undefined") return dailyAffirmations[0];
  try {
    const previous = Number.parseInt(sessionStorage.getItem(SPLASH_AFFIRMATION_INDEX_KEY) ?? "-1", 10);
    const nextIndex = Number.isFinite(previous) ? (previous + 1) % dailyAffirmations.length : 0;
    sessionStorage.setItem(SPLASH_AFFIRMATION_INDEX_KEY, String(nextIndex));
    return dailyAffirmations[nextIndex];
  } catch {
    return dailyAffirmations[Math.floor(Math.random() * dailyAffirmations.length)];
  }
}

export function loadWellbeingCheckins(): WellbeingCheckin[] {
  try { const raw = localStorage.getItem(WELLBEING_CHECKINS_KEY); return raw ? JSON.parse(raw) as WellbeingCheckin[] : []; } catch { return []; }
}

export function saveWellbeingCheckins(items: WellbeingCheckin[]) {
  try { localStorage.setItem(WELLBEING_CHECKINS_KEY, JSON.stringify(items)); } catch { /* session remains usable */ }
}

export function loadWellbeingMedications(): WellbeingMedication[] {
  try { const raw = localStorage.getItem(WELLBEING_MEDICATIONS_KEY); return raw ? JSON.parse(raw) as WellbeingMedication[] : []; } catch { return []; }
}

export function saveWellbeingMedications(items: WellbeingMedication[]) {
  try { localStorage.setItem(WELLBEING_MEDICATIONS_KEY, JSON.stringify(items)); } catch { /* session remains usable */ }
}

export function loadWellbeingAppointment(): WellbeingAppointmentNote {
  try { const raw = localStorage.getItem(WELLBEING_APPOINTMENT_KEY); return raw ? JSON.parse(raw) as WellbeingAppointmentNote : { changed: "", helped: "", questions: "", savedAt: 0 }; } catch { return { changed: "", helped: "", questions: "", savedAt: 0 }; }
}

export function saveWellbeingAppointment(note: WellbeingAppointmentNote) {
  try { localStorage.setItem(WELLBEING_APPOINTMENT_KEY, JSON.stringify(note)); } catch { /* session remains usable */ }
}

export function clearWellbeingAppointment() {
  try { localStorage.removeItem(WELLBEING_APPOINTMENT_KEY); } catch { /* session remains usable */ }
}

export function clearWellbeingData() {
  try {
    localStorage.removeItem(WELLBEING_CHECKINS_KEY);
    localStorage.removeItem(WELLBEING_MEDICATIONS_KEY);
    localStorage.removeItem(WELLBEING_APPOINTMENT_KEY);
  } catch { /* session remains usable */ }
}

export function createWellbeingCheckin(input: Omit<WellbeingCheckin, "id" | "savedAt">): WellbeingCheckin {
  return { ...input, id: `checkin-${Date.now()}`, savedAt: Date.now() };
}

export function removeWellbeingCheckin(items: WellbeingCheckin[], id: string) {
  return items.filter(item => item.id !== id);
}

export function createWellbeingMedication(input: Omit<WellbeingMedication, "id" | "savedAt">): WellbeingMedication {
  return { ...input, id: `medicine-${Date.now()}`, savedAt: Date.now() };
}

export function removeWellbeingMedication(items: WellbeingMedication[], id: string) {
  return items.filter(item => item.id !== id);
}

export function formatLocalDate(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

export function wellbeingDateLabel(date = new Date()) {
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

export function wellbeingTodayCheckin(items: WellbeingCheckin[], date = new Date()) {
  return items.find(item => item.date === formatLocalDate(date));
}

export function saveWellbeingCheckin(input: Omit<WellbeingCheckin, "id" | "savedAt">) {
  const current = loadWellbeingCheckins().filter(item => item.date !== input.date);
  const next = createWellbeingCheckin(input);
  saveWellbeingCheckins([...current, next]);
  return next;
}

export function saveWellbeingMedication(input: Omit<WellbeingMedication, "id" | "savedAt">) {
  const next = createWellbeingMedication(input);
  saveWellbeingMedications([next, ...loadWellbeingMedications()]);
  return next;
}

export function saveWellbeingAppointmentNote(input: Omit<WellbeingAppointmentNote, "savedAt">) {
  const next = { ...input, savedAt: Date.now() };
  saveWellbeingAppointment(next);
  return next;
}

export function affirmationCount() {
  return dailyAffirmations.length;
}

export function hasAffirmationLibrary() {
  return dailyAffirmations.length === 150;
}

export function wellbeingEmptyAppointment(): WellbeingAppointmentNote {
  return { changed: "", helped: "", questions: "", savedAt: 0 };
}

export function wellbeingCollections() {
  return { checkins: loadWellbeingCheckins(), medications: loadWellbeingMedications(), appointment: loadWellbeingAppointment() };
}

export function wellbeingPrivacyCopy() {
  return "Wellbeing records stay in this browser until you choose to clear them.";
}

export function wellbeingNoClinicalAdvice() {
  return WELLBEING_SAFETY_NOTE;
}
