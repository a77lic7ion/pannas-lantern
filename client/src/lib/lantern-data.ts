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
  "You built yourself from nothing but willpower",
  "Today, you are enough",
  "You have outworked every obstacle in your path",
  "Your hustle is not desperation; it is devotion",
  "You are allowed to put yourself first",
  "You have carried a family on your back",
  "Your children are proof of what a single mother can do",
  "There is no syllabus for what you have taught yourself",
  "You deserve rest that you did not have to earn",
  "Your self-taught skills are a testament to your hunger",
  "You have built a livelihood with your own mind",
  "Your patience has been a business strategy",
  "You are more than what you produce",
  "Today, your presence is your profit",
  "Your years of fighting are a resume no one can match",
  "You have earned the right to be tired",
  "Your love has been a survival plan",
  "You have made it through every worst-case scenario",
  "Your story is still being written by a woman who refuses to quit",
  "You are allowed to be proud of how far you have come",
];

const affirmationEndings = [
  "and you can pause without guilt.",
  "and that is not an opinion, it is a fact.",
  "and now it is your turn to receive.",
  "and you deserve to be celebrated for it.",
  "and being here is already something real.",
  "and today, let someone else lift you.",
  "and their strength is a reflection of yours.",
  "and you can begin again as many times as you need.",
  "and that rest is not a luxury, it is a necessity.",
  "and it is time the world gave back to you.",
  "and that is not ordinary, that is extraordinary.",
  "and patience is also a form of power.",
  "and your value is not in your productivity.",
  "and you do not have to prove it to anyone.",
  "and that testimony deserves to be heard.",
  "and tired is not the same as weak.",
  "and that anchor can hold you now too.",
  "and every one of those days was a victory.",
  "and there are chapters you have not imagined yet.",
  "and pride is not vanity, it is truth.",
];

export const dailyAffirmations = affirmationOpeners.flatMap(opener => affirmationEndings.map(ending => `${opener}; ${ending}`));

export const splashQuotes: string[] = [
  "You built yourself from nothing but willpower; and you can pause without guilt.",
  "You have outworked every obstacle in your path; and now it is your turn to receive.",
  "Your hustle is not desperation; it is devotion; and you deserve to be celebrated for it.",
  "You have carried a family on your back; and today, let someone else lift you.",
  "Your children are proof of what a single mother can do; and their strength is a reflection of yours.",
  "There is no syllabus for what you have taught yourself; and you can begin again as many times as you need.",
  "You deserve rest that you did not have to earn; and that rest is not a luxury, it is a necessity.",
  "Your self-taught skills are a testament to your hunger; and it is time the world gave back to you.",
  "You have built a livelihood with your own mind; and that is not ordinary, that is extraordinary.",
  "Your patience has been a business strategy; and patience is also a form of power.",
  "You are more than what you produce; and your value is not in your productivity.",
  "Today, your presence is your profit; and you do not have to prove it to anyone.",
  "Your years of fighting are a resume no one can match; and that testimony deserves to be heard.",
  "You have earned the right to be tired; and tired is not the same as weak.",
  "Your love has been a survival plan; and that anchor can hold you now too.",
  "You have made it through every worst-case scenario; and every one of those days was a victory.",
  "Your story is still being written by a woman who refuses to quit; and there are chapters you have not imagined yet.",
  "You are allowed to be proud of how far you have come; and pride is not vanity, it is truth.",
  "You have given enough; today, receive something good and undeserved.",
  "Your hands have built worlds; do not let anyone call that ordinary.",
  "You are a mother, a worker, a survivor; and you are still becoming.",
  "Your tomorrow does not need to be perfect; it just needs you to show up.",
  "You have been strong for everyone else; today, be strong for yourself.",
  "Your life is not a list of chores; it is a collection of loves.",
  "You do not have to earn love; you are worthy of it exactly as you are.",
  "Today, your only assignment is to exist; everything else can wait.",
  "Your worth is not in what you do; it is in who you have always been.",
  "You have survived a hundred hard mornings; that is courage, not habit.",
  "Your voice matters; do not let the world turn down the volume.",
  "You are allowed to take up space; the world is better when you fill it.",
  "Your quiet strength holds more than noise ever could.",
  "Today, choose one small joy; you have earned that too.",
  "You are not behind; you are exactly where your journey needs you.",
  "Your experience is not old news; it is the rarest kind of wisdom.",
  "You have earned the right to do things slowly; slow is still progress.",
  "Your feelings are not too much; they are the most honest part of you.",
  "The world needs your stories; your remembering is a bridge.",
  "You are a garden that has survived many winters; that is beauty.",
  "Your life is not a problem to be solved; it is a gift to be lived.",
  "You have been the rock for so long; it is okay to be the river now.",
  "Your presence is a present; unwrap it gently each morning.",
  "You do not need permission to take care of yourself.",
  "Your years of hard work are not a burden; they are a library of survived chapters.",
  "You are worthy of good things, even on the days you do not feel it.",
  "Your gentle way is not weakness; it is the deepest kind of power.",
  "Today, your only job is to be; the doing can wait.",
  "You have given enough; today, receive something small and beautiful.",
  "Your heart still knows how to hope; that is a kind of magic.",
  "You are not too old for new tenderness; tenderness has no age limit.",
  "The people you raised carry your love forward; you are never walking alone.",
  "Your life is a poem; even the hard lines are part of the beauty.",
  "You are allowed to be both brave and tired; they are not opposites.",
  "Your worth is not measured in output; it is measured in love.",
  "Today, notice what you do well; you have been trained to notice the rest.",
  "You are a lantern in someone's darkness; never forget that light.",
  "Your tomorrow does not need to be perfect; it just needs you.",
  "You have earned the right to be soft; hardness was never the point.",
  "Your story is still being written; do not close the book too soon.",
  "You are not a burden; you are a person, and that is always enough.",
  "The small things you do are not small; they are the whole fabric of love.",
  "Your joy is not selfish; it is a signal that you are still here, still alive.",
  "You have outlived things that tried to break you; that is a victory.",
  "Your kindness includes kindness toward yourself; start there today.",
  "You are allowed to be proud of yourself; no one else needs to applaud.",
  "Today, your presence matters; even if all you did was get through it.",
  "You are more than your mistakes; they are footnotes, not the story.",
  "Your life has weight; do not let anyone tell you it is light.",
  "You can ask for help without losing your strength; that is wisdom, not weakness.",
  "Your being here is already something real; the world is different because you are in it.",
  "You can begin again as many times as you need; there is no limit on fresh starts.",
  "There is room for both courage and weariness; you are not one or the other.",
  "You are worthy on the quiet days as well; the ordinary days are holy too.",
  "Your feelings may be heard without taking over; they are trying to help.",
  "A quiet beginning is still a beginning; do not despise small starts.",
  "The day does not need to be perfect to be precious; neither do you.",
  "You do not have to prove your worth; it is not on trial.",
  "Your story still has room; there are pages left to fill.",
  "You may pause before you decide what comes next; pause is a form of wisdom.",
  "Your presence matters; the world is arranged differently because you are here.",
  "You are allowed to move gently; not everything needs force.",
  "Your care for others is meaningful; it is the mark of a full heart.",
  "Rest is part of a life well lived; it is not the absence of living.",
  "You can make room for one small hope; hope does not need to be big to be real.",
  "Your wisdom does not need to shout; it speaks in the quiet moments.",
  "You have made it through difficult days; that is not luck, that is you.",
  "Your kindness includes kindness toward yourself; that is where it starts.",
  "You are more than the work waiting for you; you are the one doing the work.",
  "A softer pace can still carry you forward; speed is not the same as progress.",
  "Your feelings may be heard without taking over; listen to them.",
  "You are allowed to be tired; you have been strong for a long time.",
  "Your life is not a list of tasks; it is a collection of moments.",
  "You do not have to earn love; you are worthy of it exactly as you are.",
  "Today, your only assignment is to exist; everything else is extra.",
  "Your tomorrow is not a test; it is another chance to be human.",
  "You are a person, not a project; stop trying to fix yourself.",
  "Your worth is not up for debate; it is settled.",
  "You have been your own worst critic; try being your own kind friend.",
  "The world does not need you to be perfect; it needs you to be present.",
  "You are allowed to change your mind; growth is not a straight line.",
  "Your age is not a problem to solve; it is a milestone to honor.",
  "You are still here, still standing; that is enough for today.",
  "Your heart is wiser than your worries; trust it a little more.",
  "You have earned the right to take your time; slow is not lazy.",
  "Today, your presence is the present; everything else is wrapping.",
  "You are not too much; you have just been around people who could not hold you.",
  "Your life is a testimony; every scar is a survival story.",
  "You are allowed to be happy; joy is not just for the young.",
  "Your story is not over; there are chapters you have not imagined yet.",
  "You are a lantern; you do not erase the dark, you make it walkable.",
  "Your kindness is a currency that never devalues; spend it freely.",
  "Today, you do not have to be strong; you are allowed to be soft.",
  "Your years are not a decline; they are an ascent into deeper understanding.",
  "You have the right to be proud of who you have become.",
  "Your love is not wasted; it echoes in ways you will never see.",
  "You are allowed to rest; rest is not the opposite of purpose.",
  "Your voice is needed; do not let silence convince you otherwise.",
  "Today, your only job is to be kind to the person in the mirror.",
  "You are a survivor, not a statistic; your story is your own.",
  "Your worth is not in what you do; it is in who you are.",
  "You have earned the right to be gentle with yourself; harshness is behind you.",
  "The world is better because you are in it; that is not an opinion, it is a fact.",
  "Your heart still knows how to open; that is a triumph, not a vulnerability.",
  "You are not alone; you are part of a long line of women who endured.",
  "Today, your presence matters; even if no one says it out loud.",
  "You are allowed to be proud of how far you have come.",
  "Your wisdom is not outdated; it is the most current thing about you.",
  "You do not have to be useful to matter; your existence is the point.",
  "Your tomorrow is a blank page; you get to decide what goes on it.",
  "You are a garden that has survived many seasons; that is beauty.",
  "Your quiet strength is not invisible; it is the most powerful kind.",
  "Today, you are enough; not because of what you did, but because of who you are.",
  "You have the right to be happy; happiness is not a reward, it is a birthright.",
  "Your life is not a problem; it is a pilgrimage.",
  "You are allowed to take up space; the world made room for you for a reason.",
  "Your kindness is not naivety; it is the hardest thing you have learned.",
  "Today, your presence is enough; everything else is a bonus.",
  "You are a lantern in a world that forgets to look up; keep shining.",
  "Your years are not a closing chapter; they are a plot twist.",
  "You have the right to be loved; not for what you give, but for what you are.",
  "Your story is still being written; do not let anyone else hold the pen.",
  "Today, your only task is to be gentle; harshness is for other days.",
  "You are worthy of good things; not because you earned them, but because you exist.",
  "Your heart is not too old for new beginnings; it is just the right age.",
  "You are allowed to be both wise and uncertain; they walk together.",
  "Your presence is a gift; do not leave it unwrapped.",
  "Today, you do not have to prove anything; your life is the proof.",
  "You are a survivor, and that is not a small thing; it is everything.",
  "Your worth is not a feeling; it is a fact that feelings cannot change.",
  "You have the right to be proud of yourself; pride is not vanity, it is truth.",
  "Today, your presence matters; the world is different because you showed up.",
  "You are allowed to be tired and still be enough; rest is not failure.",
  "Your wisdom is not a relic; it is a compass.",
  "You are a lantern; you do not fix the dark, you make it walkable.",
  "Today, your only job is to be; the rest is optional.",
  "You have earned the right to be kind to yourself; you have been kind to everyone else.",
  "Your life is not a list of accomplishments; it is a collection of loves.",
  "You are allowed to be soft; softness is not surrender.",
  "Your presence is the present; everything else is just paper.",
  "Today, you are enough; not because of what you did yesterday, but because you are here.",
  "You are a garden in full bloom; do not let anyone call you winter.",
  "Your story is not a tragedy; it is a triumph with hard chapters.",
  "You have the right to be happy; happiness is not a luxury, it is a necessity.",
  "Your kindness is a superpower; do not let the world make you ordinary.",
  "Today, your presence matters; even if the world is too busy to notice.",
  "You are allowed to be proud of yourself; you have come further than you think.",
  "Your worth is not in your productivity; it is in your humanity.",
  "You are a lantern; keep burning, even when no one says thank you.",
  "Today, your only assignment is to be gentle with yourself.",
  "You have survived everything so far; that is not luck, that is you.",
  "Your heart is not too old; it is just the right age for this next thing.",
  "You are allowed to take up space; the world is better when you fill it.",
  "Your presence is a present; do not keep it to yourself.",
  "Today, your presence matters; that is the whole truth, and nothing but the truth.",
];

export function saveWellbeingCheckins(items: WellbeingCheckin[]) {
  try { localStorage.setItem(WELLBEING_CHECKINS_KEY, JSON.stringify(items)); } catch { /* session remains usable */ }
}

export function loadWellbeingCheckins(): WellbeingCheckin[] {
  try { const raw = localStorage.getItem(WELLBEING_CHECKINS_KEY); return raw ? JSON.parse(raw) as WellbeingCheckin[] : []; } catch { return []; }
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
  return splashQuotes.length;
}

const SPLASH_AFFIRMATION_INDEX_KEY = "pannas-lantern:splash-affirmation-index";

export function nextSplashAffirmation() {
  if (typeof sessionStorage === "undefined") return splashQuotes[0];
  try {
    const previous = Number.parseInt(sessionStorage.getItem(SPLASH_AFFIRMATION_INDEX_KEY) ?? "-1", 10);
    const nextIndex = Number.isFinite(previous) ? (previous + 1) % splashQuotes.length : 0;
    sessionStorage.setItem(SPLASH_AFFIRMATION_INDEX_KEY, String(nextIndex));
    return splashQuotes[nextIndex];
  } catch {
    return splashQuotes[Math.floor(Math.random() * splashQuotes.length)];
  }
}

export function affirmationForDate(date = new Date()) {
  const dayNumber = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  return splashQuotes[((dayNumber % splashQuotes.length) + splashQuotes.length) % splashQuotes.length];
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
