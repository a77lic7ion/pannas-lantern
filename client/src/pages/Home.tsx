import { AIChatBox, type Message } from "@/components/AIChatBox";
import {
  Archive,
  ArrowUpRight,
  BookOpen,
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  CircleAlert,
  Cloud,
  Feather,
  FileText,
  Flower2,
  FolderOpen,
  Lightbulb,
  ListChecks,
  MessageSquareText,
  MessageSquarePlus,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  PenLine,
  Plus,
  Quote,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { defaultEndpointForProvider, providerDefaults, providerKinds, type ProviderKind } from "@shared/providerConfig";
import { discoverLocalModels, type LocalProvider } from "@/lib/localLlm";
import { assistLantern, assistNotebookChat, buildPageWorkspaceContext } from "@/lib/lanternAssistant";
import {
  addSourceToTestNotebook,
  clearSoul,
  clearTestNote,
  createProviderPreference,
  addItemToWritingCollection,
  createTestItem,
  createTestNotebook,
  createWritingCollection,
  updateWritingCollection,
  updateWritingItemInCollection,
  loadTestCollections,
  loadTestNotebooks,
  loadWritingCollections,
  selectedWritingAssistantContext,
  loadTestNote,
  loadTestNotes,
  deleteTestNote,
  loadProviderPreferences,
  loadChatSessions,
  saveChatSessions,
  type ChatSessionEntry,
  loadSoul,
  loadWellbeingAppointment,
  loadWellbeingCheckins,
  loadWellbeingMedications,
  saveWellbeingCheckins,
  saveWellbeingMedications,
  saveWellbeingAppointment,
  saveWellbeingCheckin,
  saveWellbeingMedication,
  saveWellbeingAppointmentNote,
  removeWellbeingCheckin,
  removeWellbeingMedication,
  affirmationForDate,
  nextSplashAffirmation,
  wellbeingDateLabel,
  wellbeingReportItems,
  WELLBEING_MOODS,
  WELLBEING_ENERGY,
  WELLBEING_COMFORTS,
  WELLBEING_SAFETY_NOTE,
  saveProviderPreferences,
  saveSoul,
  saveTestCollections,
  saveTestNotebooks,
  saveWritingCollections,
  saveTestNote,
  tabAssistantCopy,
  removeProviderPreference,
  removeSourceFromTestNotebook,
  removeTestItem,
  updateTestNotebookNotes,
  activeProvider,
  type LanternTab,
  type SavedProviderPreference,
  type SavedTestCollections,
  type SavedTestItem,
  type SavedTestNote,
  type SavedTestNotebook,
  type WritingCollection,
  type WritingCollectionKind,
  type WellbeingCheckin,
  type WellbeingMedication,
  type WellbeingAppointmentNote
} from "@/lib/lantern-data";

const LANTERN_EMBLEM = `${import.meta.env.BASE_URL}emblems/lantern-emblem.jpg`;

type LanternActionProposal = {
  type: string;
  label: string;
  confirmation: string;
  payload: Record<string, string>;
};

type TabSpec = {
  id: LanternTab;
  label: string;
  icon: typeof CalendarDays;
  accent: string;
  soft: string;
  crumb: string;
  subtitle: string;
  suggestions: string[];
};

const tabs: TabSpec[] = [
  { id: "today", label: "Today", icon: CalendarDays, accent: "#bc882e", soft: "#fbf0d8", crumb: "A quiet place to begin", subtitle: "Begin with whatever matters today.", suggestions: ["Add a gentle priority", "Choose one next step"] },
  { id: "notebooks", label: "Notebooks", icon: BookOpen, accent: "#bc882e", soft: "#fbf0d8", crumb: "Notebooks", subtitle: "Gather sources and questions in one place.", suggestions: ["Create a notebook", "Add a source", "Ask how to begin"] },
  { id: "novel", label: "Novel", icon: BookOpenCheck, accent: "#a15e69", soft: "#f5e5e8", crumb: "Novel", subtitle: "Your story can begin at its own pace.", suggestions: ["Create a chapter", "Capture an idea", "Begin with one sentence"] },
  { id: "poems", label: "Poems", icon: Feather, accent: "#a55f77", soft: "#f5e5eb", crumb: "Poems", subtitle: "Bring poems in when you are ready.", suggestions: ["Import poems", "Start a collection", "Ask about sorting"] },
  { id: "blog", label: "Blog", icon: FileText, accent: "#78804a", soft: "#eef0df", crumb: "Blog archive", subtitle: "Preserve earlier writing, one file at a time.", suggestions: ["Import original HTML", "Start an archive", "Ask about preserving sources"] },
  { id: "notes", label: "Notes", icon: StickyNote, accent: "#668277", soft: "#e7f0eb", crumb: "Notes", subtitle: "A place to keep the thought before it disappears.", suggestions: ["Start a note", "Turn a thought into a task", "Ask what to save"] },
  { id: "wellbeing", label: "Wellbeing", icon: Flower2, accent: "#8c7599", soft: "#eee6f1", crumb: "Wellbeing", subtitle: "A gentle place to notice how you are arriving today.", suggestions: ["Start a check-in", "Add a comfort note", "Ask about preparing for an appointment"] },
  { id: "settings", label: "Settings", icon: Settings2, accent: "#5d858d", soft: "#e6f0f1", crumb: "Settings", subtitle: "Keep the setup gentle and private.", suggestions: ["Explain privacy", "Review the setup", "Ask about local storage"] },
];

function IconButton({ children, label, onClick }: { children: ReactNode; label: string; onClick?: () => void }) {
  return <button className="button ghost" type="button" onClick={onClick} aria-label={label}>{children}</button>;
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function EmptyState({ icon, title, copy, action, onAction, compact = false }: { icon: ReactNode; title: string; copy: string; action?: string; onAction?: () => void; compact?: boolean }) {
  return <div className={`empty-state ${compact ? "compact" : ""}`}>
    <div className="empty-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{copy}</p>
    {action && onAction && <button className="button small" type="button" onClick={onAction}><Plus size={15} />{action}</button>}
  </div>;
}

function PaperPrompt({ icon, eyebrow, title, copy }: { icon: ReactNode; eyebrow: string; title: string; copy: string }) {
  return <div className="paper-prompt"><div className="paper-prompt-icon">{icon}</div><div><span>{eyebrow}</span><h3>{title}</h3><p>{copy}</p></div></div>;
}


function WritingCollectionModal({ kind, onClose, onSave }: { kind: WritingCollectionKind; onClose: () => void; onSave: (title: string, description: string, firstItem?: SavedTestItem) => void }) {
  const labels = kind === "novel" ? { noun: "novel", title: "Create a novel", description: "Give your novel a home before adding chapters." } : kind === "blog" ? { noun: "blog", title: "Create a blog archive", description: "Create a named blog so its posts stay together." } : { noun: "poems collection", title: "Create a poems collection", description: "Create a collection before importing or writing poems." };
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [file, setFile] = useState<File | null>(null);
  const submit = async () => { let firstItem: SavedTestItem | undefined; if (file) firstItem = createTestItem(file.name, await file.text()); onSave(title, description, firstItem); };
  return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="writing-collection-title"><IconButton label="Close dialog" onClick={onClose}><X size={19} /></IconButton><h2 id="writing-collection-title">{labels.title}</h2><p>{labels.description} You can also import a first file now.</p><label>{labels.noun} name<input autoFocus value={title} onChange={event => setTitle(event.target.value)} placeholder={`e.g. My ${labels.noun}`} /></label><label>Short description<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="What belongs here?" /></label><label className="file-field">Import a first entry (optional)<input type="file" accept=".txt,.md,.html,.htm" onChange={event => setFile(event.target.files?.[0] ?? null)} /></label><div className="modal-actions"><button className="button ghost" type="button" onClick={onClose}>Cancel</button><button className="button accent" type="button" onClick={() => void submit()}><Plus size={16} />Create {labels.noun}</button></div></div></div>;
}

function AddItemModal({ type, onClose, onSave }: { type: LanternTab; onClose: () => void; onSave: (title: string, body: string) => void }) {
  const labels: Record<LanternTab, { title: string; description: string; label: string }> = {
    today: { title: "Add a gentle priority", description: "A few words are enough to begin your day.", label: "Priority" },
    notebooks: { title: "Add a source", description: "Bring in a file, a link, or a piece of text when a notebook is open.", label: "Source title or link" },

    novel: { title: "Create a chapter", description: "Give the next part of your story a title. The rest can come later.", label: "Chapter title" },
    poems: { title: "Import poems", description: "Bring in a poem file or a small collection when you are ready.", label: "Import name" },
    blog: { title: "Import blog HTML", description: "Keep the original file, then make room to revisit it later.", label: "Archive name" },
    notes: { title: "New note", description: "Capture the thought before it fades.", label: "Note title" },
    wellbeing: { title: "New comfort note", description: "A private place to record what helps.", label: "Note title" },
    settings: { title: "Owner setup", description: "Connection details remain outside the normal workspace.", label: "Project label" },
  };
  const copy = labels[type];
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const saveModalItem = async () => {
    let importedTitle = title;
    let importedBody = body;
    if (selectedFile) {
      try {
        importedTitle = title.trim() || selectedFile.name;
        importedBody = body.trim() || await selectedFile.text();
      } catch {
        setFileError("That file could not be read in this browser. Try a plain-text export instead.");
        return;
      }
    }
    onSave(importedTitle, importedBody);
  };
  const supportsFile = ["notebooks", "blog", "poems"].includes(type);
  return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
    <IconButton label="Close dialog" onClick={onClose}><X size={19} /></IconButton>
    <h2 id="modal-title">{copy.title}</h2><p>{copy.description}</p>
    <label>{copy.label}<input placeholder={copy.label} value={title} onChange={event => setTitle(event.target.value)} autoFocus /></label>
    {supportsFile && <label>Optional file<input type="file" accept=".txt,.md,.vtt,.srt,.html,.htm,text/plain,text/vtt,text/html" onChange={event => { setSelectedFile(event.target.files?.[0] ?? null); setFileError(null); }} />{selectedFile && <span className="muted tiny">Selected: {selectedFile.name}</span>}{fileError && <span className="muted tiny">{fileError}</span>}</label>}
    <label>Notes<textarea placeholder="A few words are enough to begin." value={body} onChange={event => setBody(event.target.value)} /></label>
    <div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button accent" type="button" onClick={saveModalItem}>Save locally</button></div>
  </div></div>;
}

function NotebookModal({ onClose, onSave }: { onClose: () => void; onSave: (title: string, description: string) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  return <div className="modal-backdrop" role="presentation"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="new-notebook-title">
    <IconButton label="Close dialog" onClick={onClose}><X size={19} /></IconButton>
    <h2 id="new-notebook-title">Create a notebook</h2><p>Keep related sources, questions, and future Lantern conversations together.</p>
    <label>Notebook title<input placeholder="For example: A research question" value={title} onChange={event => setTitle(event.target.value)} autoFocus /></label>
    <label>What would you like to gather here?<textarea placeholder="A short description is optional." value={description} onChange={event => setDescription(event.target.value)} /></label>
    <div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button accent" type="button" onClick={() => onSave(title, description)}>Create locally</button></div>
  </div></div>;
}

function ProviderModal({ onClose, onSave }: { onClose: () => void; onSave: (input: Pick<SavedProviderPreference, "kind" | "label" | "model" | "endpoint" | "apiKey">) => void }) {
  const [kind, setKind] = useState<ProviderKind>("OpenRouter");
  const [label, setLabel] = useState("");
  const [model, setModel] = useState("");
  const [endpoint, setEndpoint] = useState(defaultEndpointForProvider("OpenRouter"));
  const [apiKey, setApiKey] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [connectedEndpoint, setConnectedEndpoint] = useState("");
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const selectProvider = (next: ProviderKind) => { setKind(next); setEndpoint(defaultEndpointForProvider(next)); setModels([]); setModel(""); setConnectedEndpoint(""); setTestError(null); };
  const fetchModels = async () => {
    setTesting(true); setTestError(null);
    try {
      const result = await discoverLocalModels(kind, apiKey);
      setModels(result); setConnectedEndpoint(endpoint); setEndpoint(endpoint); setModel(current => current || result[0] || "");
    } catch (error) {
      setTestError(error instanceof Error ? error.message : "Could not reach that endpoint.");
    } finally {
      setTesting(false);
    }
  };
  const canSave = Boolean(model.trim() && connectedEndpoint);
  return <div className="modal-backdrop" role="presentation"><div className="modal provider-modal" role="dialog" aria-modal="true" aria-labelledby="provider-title">
    <IconButton label="Close provider setup" onClick={onClose}><X size={19} /></IconButton>
    <h2 id="provider-title">Connect a model</h2><p>Choose a provider, enter its endpoint and key, test it to fetch models, then save the connection. Everything is stored only in this browser.</p>
    <label>Provider<select value={kind} onChange={event => selectProvider(event.target.value as ProviderKind)}>{providerKinds.map(option => <option key={option}>{option}</option>)}</select></label>
    <label>Endpoint <span className="muted tiny">{providerDefaults[kind].note}</span><input value={endpoint} readOnly /></label>
    <label>API key<input type="password" value={apiKey} placeholder="Your provider API key" autoComplete="off" onChange={event => { setApiKey(event.target.value); setConnectedEndpoint(""); setModels([]); setTestError(null); }} /></label>
    <div className="provider-test-row"><button className="button" type="button" disabled={!apiKey.trim() || testing} onClick={fetchModels}>{testing ? "Testing connection…" : "Fetch models & test"}</button>{connectedEndpoint && <span className="provider-status success"><CheckCircle2 size={16} />Connected · {models.length} models available</span>}{testError && <span className="provider-status error"><CircleAlert size={16} />{testError}</span>}</div>
    <label>Model{models.length ? <select value={model} onChange={event => setModel(event.target.value)}>{models.map(option => <option key={option}>{option}</option>)}</select> : <input value={model} onChange={event => setModel(event.target.value)} placeholder="The model id, e.g. mistral-small-latest" />}</label>
    <label>Label <span className="muted tiny">optional</span><input value={label} placeholder="For example: Writing assistant" onChange={event => setLabel(event.target.value)} /></label>
    <div className="secure-key-note"><ShieldCheck size={18} />The key stays in this browser. Requests go through this app's own server proxy to {kind} — the key is never stored server-side.</div>
    <div className="modal-actions"><button className="button" type="button" onClick={onClose}>Cancel</button><button className="button accent" type="button" disabled={!canSave} onClick={() => onSave({ kind, label, model, endpoint: connectedEndpoint, apiKey })}>Save connection</button></div>
  </div></div>;
}

function ItemRow({ item, icon, onDelete }: { item: SavedTestItem; icon: ReactNode; onDelete: () => void }) {
  return <div className="list-row"><div className="list-icon">{icon}</div><div><p className="row-title">{item.title}</p><p className="row-meta">Saved in this browser</p></div><IconButton label={`Delete ${item.title}`} onClick={onDelete}><Trash2 size={17} /></IconButton></div>;
}

function TodayContent({ items, onAdd, onDelete, wellbeingCheckins }: { items: SavedTestItem[]; onAdd: () => void; onDelete: (savedAt: number) => void; wellbeingCheckins: WellbeingCheckin[] }) {
  return <div className="today-layout">
    <Card className="date-card"><div className="date-tile"><div className="date-month">Today</div><div className="date-number">—</div><div className="muted tiny">Your day, your pace</div></div><div className="week-strip empty-week"><span>Make room for what matters.</span></div><div className="today-wellbeing-log" aria-label="Recent wellbeing check-ins"><span className="eyebrow">Wellbeing log</span><div>{Array.from({ length: 7 }, (_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); const key = date.toISOString().slice(0, 10); const logged = wellbeingCheckins.some(item => item.date === key); return <span className={logged ? "logged" : ""} key={key} title={logged ? "Wellbeing check-in saved" : "No check-in saved"}>{date.getDate()}{logged && <i />}</span>; })}</div><small>{wellbeingCheckins.length ? `${wellbeingCheckins.length} check-in${wellbeingCheckins.length === 1 ? "" : "s"} saved locally` : "Your check-ins can appear here"}</small></div></Card>

    <Card className="compact-card quiet-panel"><div className="card-header"><h2 className="card-heading">Continue where you left off</h2><BookOpen size={18} /></div><PaperPrompt icon={<PenLine size={21} />} eyebrow="A waiting page" title="Your writing can begin gently" copy="A chapter or notebook will appear after you create it." /></Card>
    <Card className="compact-card"><div className="card-header"><h2 className="card-heading">Today’s gentle priorities</h2><Feather size={18} /></div>{items.length ? items.map(item => <div className="task-row" key={item.savedAt}><Circle size={16} /><span>{item.title}</span><IconButton label={`Delete ${item.title}`} onClick={() => onDelete(item.savedAt)}><Trash2 size={16} /></IconButton></div>) : <EmptyState compact icon={<Circle size={22} />} title="A clear beginning" copy="Add one small priority. You do not need to plan the whole day." action="Add a priority" onAction={onAdd} />}</Card>
    <Card className="compact-card quiet-panel"><div className="card-header"><h2 className="card-heading">Recent notebooks</h2><BookOpen size={18} /></div><PaperPrompt icon={<FolderOpen size={21} />} eyebrow="A place to gather" title="No notebooks yet" copy="A question, project, or source can become the first one." /></Card>
  </div>;
}

function NotebooksContent({ notebook, notebooks, onSelectNotebook, onCreateNotebook, onAddSource, onDeleteNotebook, onDeleteSource, onSaveNote, onAddDocument, onDeleteDocument, onUpdateNotebookTitle, providers }: { notebook?: SavedTestNotebook; notebooks: SavedTestNotebook[]; onSelectNotebook: (id: string) => void; onCreateNotebook: () => void; onAddSource: () => void; onDeleteNotebook: (id: string) => void; onDeleteSource: (savedAt: number) => void; onSaveNote: (notes: string) => void; onAddDocument: (title: string, content: string) => void; onDeleteDocument: (savedAt: number) => void; onUpdateNotebookTitle: (title: string, description: string) => void; providers: SavedProviderPreference[] }) {
  const [noteDraft, setNoteDraft] = useState(notebook?.notes ?? "");
  const [titleDraft, setTitleDraft] = useState(notebook?.title ?? "");
  const [descriptionDraft, setDescriptionDraft] = useState(notebook?.description ?? "");
  const [activeView, setActiveView] = useState<"write" | "data" | "chat">("write");
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatBusy, setChatBusy] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [newDocContent, setNewDocContent] = useState("");
  const [showAddDoc, setShowAddDoc] = useState(false);

  useEffect(() => { 
    setNoteDraft(notebook?.notes ?? ""); 
    setTitleDraft(notebook?.title ?? "");
    setDescriptionDraft(notebook?.description ?? "");
  }, [notebook?.id, notebook?.notes, notebook?.title, notebook?.description]);

  if (!notebook) {
    return (
      <Card className="empty-workspace folio-workspace">
        <div className="folio-number">01</div>
        <EmptyState 
          icon={<BookOpen size={32} />} 
          title="Your first notebook can begin here" 
          copy="Create a notebook for a question, a project, or a body of writing you want to keep together." 
          action="Create a notebook" 
          onAction={onCreateNotebook} 
        />
      </Card>
    );
  }

  const handleSendChat = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || !notebook || chatBusy) return;
    const provider = activeProvider(providers);
    if (!provider || !provider.model) {
      setChatMessages(current => [...current, { role: "user", content: trimmed }, { role: "assistant", content: "Connect a model first: **Settings › Assistant providers**. Once a provider is saved, I can read this notebook's sources and documents and answer from them." }]);
      return;
    }
    const history = chatMessages.filter((message): message is Message & { role: "user" | "assistant" } => message.role !== "system").slice(-8);
    setChatMessages(current => [...current, { role: "user", content: trimmed }]);
    setChatBusy(true);
    try {
      const answer = await assistNotebookChat({
        notebook: { title: notebook.title, description: notebook.description, notes: notebook.notes, sources: notebook.sources, documents: notebook.documents },
        prompt: trimmed,
        recentMessages: history.map(message => ({ role: message.role as "user" | "assistant", content: message.content })),
        provider: { kind: provider.kind, endpoint: provider.endpoint, apiKey: provider.apiKey, model: provider.model },
      });
      setChatMessages(current => [...current, { role: "assistant", content: answer }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setChatMessages(current => [...current, { role: "assistant", content: `I couldn't complete that request. ${message}` }]);
    } finally {
      setChatBusy(false);
    }
  };

  return (
    <div className="notebooks-workspace">
      <div className="notebook-header">
        <input 
          className="notebook-title-input" 
          value={titleDraft}
          onChange={e => setTitleDraft(e.target.value)}
          onBlur={() => onUpdateNotebookTitle(titleDraft, descriptionDraft)}
          placeholder="Notebook title"
        />
        <textarea 
          className="notebook-description-input" 
          value={descriptionDraft}
          onChange={e => setDescriptionDraft(e.target.value)}
          onBlur={() => onUpdateNotebookTitle(titleDraft, descriptionDraft)}
          placeholder="Description (optional)"
          rows={1}
        />
      </div>

      <div className="notebook-view-tabs">
        <button 
          className={activeView === "write" ? "active" : ""} 
          onClick={() => setActiveView("write")}
        >
          <Feather size={16} /> Write
        </button>
        <button 
          className={activeView === "data" ? "active" : ""} 
          onClick={() => setActiveView("data")}
        >
          <Upload size={16} /> Data ({notebook.sources.length})
        </button>
        <button 
          className={activeView === "chat" ? "active" : ""} 
          onClick={() => setActiveView("chat")}
        >
          <Sparkles size={16} /> Ask AI
        </button>
      </div>

      {activeView === "write" && (
        <Card className="notebook-write-card">
          <div className="card-header">
            <h3>Write freely</h3>
            <span className="muted tiny">Jot down thoughts, research questions, or anything before adding data.</span>
          </div>
          <textarea 
            className="notebook-notes-input-large" 
            value={noteDraft} 
            onChange={event => setNoteDraft(event.target.value)} 
            placeholder="Start writing your thoughts, research questions, or anything you want to explore..."
            rows={12}
          />
          <div className="notebook-notes-actions">
            <span className="muted tiny">{noteDraft === notebook?.notes ? "Saved in this browser." : "Unsaved changes."}</span>
            <button className="button accent" type="button" onClick={() => onSaveNote(noteDraft)}>
              <Feather size={17} /> Save notes
            </button>
          </div>
        </Card>
      )}

      {activeView === "data" && (
        <div className="notebook-data-view">
          <Card className="notebook-sources-card">
            <div className="card-header">
              <h3>Sources & Documents</h3>
              <IconButton label="Add source" onClick={onAddSource}><Plus size={19} /></IconButton>
            </div>
            {notebook.sources.length > 0 ? (
              <div className="sources-list">
                {notebook.sources.map(source => (
                  <div className="source-item" key={source.savedAt}>
                    <div className="list-icon"><Upload size={18} /></div>
                    <div className="source-content">
                      <p className="item-title">{source.title}</p>
                      <p className="item-detail">{source.body.substring(0, 100)}...</p>
                    </div>
                    <IconButton label={`Delete ${source.title}`} onClick={() => onDeleteSource(source.savedAt)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState 
                compact 
                icon={<Upload size={22} />} 
                title="No sources yet" 
                copy="Add files, links, or text to use as reference material." 
                action="Add a source" 
                onAction={onAddSource} 
              />
            )}
          </Card>

          <Card className="notebook-documents-card">
            <div className="card-header">
              <h3>Quick Documents</h3>
              <button className="button small" onClick={() => setShowAddDoc(!showAddDoc)}>
                <Plus size={15} /> New Document
              </button>
            </div>
            {showAddDoc && (
              <div className="add-document-form">
                <input 
                  placeholder="Document title" 
                  value={newDocTitle}
                  onChange={e => setNewDocTitle(e.target.value)}
                />
                <textarea 
                  placeholder="Paste text content here..." 
                  value={newDocContent}
                  onChange={e => setNewDocContent(e.target.value)}
                  rows={4}
                />
                <div className="form-actions">
                  <button className="button ghost" onClick={() => setShowAddDoc(false)}>Cancel</button>
                  <button 
                    className="button accent" 
                    onClick={() => {
                      if (newDocTitle.trim() && newDocContent.trim()) {
                        onAddDocument(newDocTitle, newDocContent);
                        setNewDocTitle("");
                        setNewDocContent("");
                        setShowAddDoc(false);
                      }
                    }}
                  >
                    Add Document
                  </button>
                </div>
              </div>
            )}
            {notebook.documents && notebook.documents.length > 0 ? (
              <div className="documents-list">
                {notebook.documents.map(doc => (
                  <div className="document-item" key={doc.savedAt}>
                    <div className="list-icon"><FileText size={18} /></div>
                    <div className="document-content">
                      <p className="item-title">{doc.title}</p>
                      <p className="item-detail">{doc.body.substring(0, 100)}...</p>
                    </div>
                    <IconButton label={`Delete ${doc.title}`} onClick={() => onDeleteDocument(doc.savedAt)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                ))}
              </div>
            ) : (
              !showAddDoc && (
                <EmptyState 
                  compact 
                  icon={<FileText size={22} />} 
                  title="No documents yet" 
                  copy="Create documents from your research or paste text directly." 
                  action="Create document" 
                  onAction={() => setShowAddDoc(true)} 
                />
              )
            )}
          </Card>
        </div>
      )}

      {activeView === "chat" && (
        <div className="notebook-chat-view">
          <Card className="notebook-chat-card">
            <div className="card-header">
              <h3>Ask AI about your notebook</h3>
              <span className="muted tiny">The Lantern reads only this notebook: its notes, sources, and documents.</span>
            </div>
            <AIChatBox
              messages={chatMessages}
              onSendMessage={handleSendChat}
              isLoading={chatBusy}
              placeholder={`Ask about "${notebook.title}"…`}
              height="460px"
              emptyStateMessage="Ask questions like 'What is this notebook about?' or 'Summarize the attached sources.'"
              suggestedPrompts={["What is this notebook about?", "Summarize the key points", "What questions does this material raise?"]}
            />
          </Card>
        </div>
      )}

      <div className="notebook-sidebar">
        <Card>
          <div className="card-header">
            <h3>Notebooks</h3>
            <IconButton label="Create notebook" onClick={onCreateNotebook}><Plus size={19} /></IconButton>
          </div>
          {notebooks.map(item => (
            <div className={`source-item ${item.id === notebook.id ? "selected" : ""}`} key={item.id}>
              <button type="button" className="source-select" onClick={() => onSelectNotebook(item.id)}>
                <div className="list-icon"><BookOpen size={18} /></div>
                <div>
                  <p className="item-title">{item.title}</p>
                  <p className="item-detail">{item.sources.length} sources · {item.notes.length > 0 ? "Has notes" : "No notes"}</p>
                </div>
                <ChevronRight className="row-right" size={16} />
              </button>
              <IconButton label={`Delete ${item.title}`} onClick={() => onDeleteNotebook(item.id)}>
                <Trash2 size={16} />
              </IconButton>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function NovelContent({ collections, selectedId, onSelect, onCreate, onAddItem, onDeleteCollection, onDeleteItem, onUpdateCollection, onUpdateItem }: { collections: WritingCollection[]; selectedId: string; onSelect: (id: string) => void; onCreate: () => void; onAddItem: () => void; onDeleteCollection: (id: string) => void; onDeleteItem: (savedAt: number) => void; onUpdateCollection: (id: string, title: string, description: string) => void; onUpdateItem: (savedAt: number, title: string, body: string) => void }) {
  const novels = collections.filter(item => item.kind === "novel");
  const selected = novels.find(item => item.id === selectedId) ?? novels[0];
  const [chapterId, setChapterId] = useState<number | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [metaDraft, setMetaDraft] = useState({ title: "", description: "" });
  const [editingMeta, setEditingMeta] = useState(false);
  const activeChapter = selected?.items.find(item => item.savedAt === chapterId) ?? null;
  useEffect(() => { setChapterId(null); setEditingMeta(false); setMetaDraft({ title: selected?.title ?? "", description: selected?.description ?? "" }); }, [selected?.id]);
  useEffect(() => { setTitleDraft(activeChapter?.title ?? ""); setBodyDraft(activeChapter?.body ?? ""); }, [chapterId, activeChapter?.savedAt]);
  const words = bodyDraft.trim() ? bodyDraft.trim().split(/\s+/).length : 0;
  const totalWords = selected ? selected.items.reduce((sum, item) => sum + (item.body.trim() ? item.body.trim().split(/\s+/).length : 0), 0) : 0;

  if (!novels.length) return <Card className="empty-workspace folio-workspace"><div className="folio-number">01</div><EmptyState icon={<BookOpenCheck size={32} />} title="Your first novel begins here" copy="Create a novel to give your story a home — chapters, drafts, and ideas all stay together." action="Create novel" onAction={onCreate} /></Card>;

  return <div className="novel-desk">
    <aside className="novel-books">
      <div className="card-header"><h2 className="card-heading">Novels</h2><IconButton label="Create novel" onClick={onCreate}><Plus size={19} /></IconButton></div>
      {novels.map(item => <div className={`source-item ${item.id === selected?.id ? "selected" : ""}`} key={item.id}>
        <button type="button" className="source-select" onClick={() => onSelect(item.id)}><div className="list-icon"><BookOpenCheck size={18} /></div><div><p className="item-title">{item.title}</p><p className="item-detail">{item.items.length} chapter{item.items.length === 1 ? "" : "s"} · {item.items.reduce((sum, ch) => sum + (ch.body.trim() ? ch.body.trim().split(/\s+/).length : 0), 0).toLocaleString()} words</p></div><ChevronRight className="row-right" size={16} /></button>
        <IconButton label={`Delete ${item.title}`} onClick={() => onDeleteCollection(item.id)}><Trash2 size={16} /></IconButton>
      </div>)}
      {selected && <div className="novel-meta">
        {editingMeta
          ? <div className="novel-meta-edit"><input value={metaDraft.title} aria-label="Novel title" placeholder="Novel title" onChange={event => setMetaDraft(current => ({ ...current, title: event.target.value }))} /><textarea value={metaDraft.description} aria-label="Novel description" placeholder="Premise or notes (optional)" rows={2} onChange={event => setMetaDraft(current => ({ ...current, description: event.target.value }))} /><div className="inline-actions"><button className="button small ghost" type="button" onClick={() => { setEditingMeta(false); setMetaDraft({ title: selected.title, description: selected.description }); }}>Cancel</button><button className="button small accent" type="button" onClick={() => { onUpdateCollection(selected.id, metaDraft.title, metaDraft.description); setEditingMeta(false); }}>Save details</button></div></div>
          : <button className="button small ghost novel-meta-edit-btn" type="button" onClick={() => { setMetaDraft({ title: selected.title, description: selected.description }); setEditingMeta(true); }}><Settings2 size={15} />Edit novel details</button>}
      </div>}
    </aside>
    <Card className="novel-chapters">
      <div className="card-header"><h2 className="card-heading">Chapters</h2><IconButton label="Add chapter" onClick={onAddItem}><Plus size={19} /></IconButton></div>
      {selected && selected.items.length ? <div className="chapter-list">{selected.items.map((item, index) => <button type="button" key={item.savedAt} className={`chapter-row ${item.savedAt === chapterId ? "active" : ""}`} onClick={() => setChapterId(item.savedAt)}>
        <span className="chapter-number">{String(index + 1).padStart(2, "0")}</span>
        <span className="chapter-copy"><strong>{item.title || "Untitled chapter"}</strong><small>{item.body.trim() ? `${item.body.trim().split(/\s+/).length.toLocaleString()} words` : "Empty"}</small></span>
        <ChevronRight size={15} />
      </button>)}</div> : <EmptyState compact icon={<BookOpenCheck size={22} />} title="No chapters yet" copy="Add the first chapter and start writing." action="Add chapter" onAction={onAddItem} />}
      {selected && <p className="muted tiny novel-total">Manuscript total: {totalWords.toLocaleString()} words</p>}
    </Card>
    <Card className="novel-manuscript">
      {activeChapter && selected
        ? <div className="manuscript-editor">
            <div className="manuscript-head">
              <input className="chapter-title-input" value={titleDraft} placeholder="Chapter title" aria-label="Chapter title" onChange={event => setTitleDraft(event.target.value)} />
              <div className="inline-actions">
                <span className="muted tiny">{words.toLocaleString()} words</span>
                <IconButton label="Delete chapter" onClick={() => { onDeleteItem(activeChapter.savedAt); setChapterId(null); }}><Trash2 size={16} /></IconButton>
                <button className="button small accent" type="button" disabled={titleDraft === activeChapter.title && bodyDraft === activeChapter.body} onClick={() => onUpdateItem(activeChapter.savedAt, titleDraft, bodyDraft)}><Feather size={15} />Save chapter</button>
              </div>
            </div>
            <textarea className="manuscript-body" value={bodyDraft} placeholder="Begin the chapter…" aria-label="Chapter body" onChange={event => setBodyDraft(event.target.value)} />
          </div>
        : <EmptyState icon={<PenLine size={26} />} title="Select a chapter" copy="Choose a chapter from the list to read or edit it. Add a chapter to begin the manuscript." action="Add chapter" onAction={onAddItem} />}
    </Card>
  </div>;
}

function PoemsContent({ collections, selectedId, onSelect, onCreate, onAddItem, onDeleteCollection, onDeleteItem, onUpdateCollection, onUpdateItem }: { collections: WritingCollection[]; selectedId: string; onSelect: (id: string) => void; onCreate: () => void; onAddItem: () => void; onDeleteCollection: (id: string) => void; onDeleteItem: (savedAt: number) => void; onUpdateCollection: (id: string, title: string, description: string) => void; onUpdateItem: (savedAt: number, title: string, body: string) => void }) {
  const books = collections.filter(item => item.kind === "poems");
  const selected = books.find(item => item.id === selectedId) ?? books[0];
  const [poemAt, setPoemAt] = useState<number | null>(null);
  const [mode, setMode] = useState<"read" | "edit">("read");
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [metaDraft, setMetaDraft] = useState({ title: "", description: "" });
  const [editingMeta, setEditingMeta] = useState(false);
  const activePoem = selected?.items.find(item => item.savedAt === poemAt) ?? null;
  useEffect(() => { setPoemAt(null); setMode("read"); setEditingMeta(false); setMetaDraft({ title: selected?.title ?? "", description: selected?.description ?? "" }); }, [selected?.id]);
  useEffect(() => { setTitleDraft(activePoem?.title ?? ""); setBodyDraft(activePoem?.body ?? ""); }, [poemAt, activePoem?.savedAt]);

  if (!books.length) return <Card className="empty-workspace folio-workspace"><div className="folio-number">01</div><EmptyState icon={<Feather size={32} />} title="A place for your poems" copy="Create a collection — a chapbook, a theme, a season — and gather poems beneath it." action="Create collection" onAction={onCreate} /></Card>;

  return <div className="poems-page">
    <aside className="poems-rail">
      <div className="card-header"><h2 className="card-heading">Collections</h2><IconButton label="Create collection" onClick={onCreate}><Plus size={19} /></IconButton></div>
      {books.map(item => <div className={`source-item ${item.id === selected?.id ? "selected" : ""}`} key={item.id}>
        <button type="button" className="source-select" onClick={() => onSelect(item.id)}><div className="list-icon"><Feather size={18} /></div><div><p className="item-title">{item.title}</p><p className="item-detail">{item.items.length} poem{item.items.length === 1 ? "" : "s"}</p></div><ChevronRight className="row-right" size={16} /></button>
        <IconButton label={`Delete ${item.title}`} onClick={() => onDeleteCollection(item.id)}><Trash2 size={16} /></IconButton>
      </div>)}
      {selected && <div className="poems-meta">
        {editingMeta
          ? <div className="novel-meta-edit"><input value={metaDraft.title} aria-label="Collection title" placeholder="Collection title" onChange={event => setMetaDraft(current => ({ ...current, title: event.target.value }))} /><textarea value={metaDraft.description} aria-label="Collection description" placeholder="A line about this collection (optional)" rows={2} onChange={event => setMetaDraft(current => ({ ...current, description: event.target.value }))} /><div className="inline-actions"><button className="button small ghost" type="button" onClick={() => { setEditingMeta(false); setMetaDraft({ title: selected.title, description: selected.description }); }}>Cancel</button><button className="button small accent" type="button" onClick={() => { onUpdateCollection(selected.id, metaDraft.title, metaDraft.description); setEditingMeta(false); }}>Save details</button></div></div>
          : <button className="button small ghost novel-meta-edit-btn" type="button" onClick={() => { setMetaDraft({ title: selected.title, description: selected.description }); setEditingMeta(true); }}><Settings2 size={15} />Edit collection details</button>}
      </div>}
    </aside>
    <div className="poems-main">
      <Card className="poems-index">
        <div className="card-header"><h2 className="card-heading">Poems</h2><IconButton label="Add poem" onClick={onAddItem}><Plus size={19} /></IconButton></div>
        {selected && selected.items.length ? <div className="poem-list">{selected.items.map(item => <button type="button" key={item.savedAt} className={`poem-row ${item.savedAt === poemAt ? "active" : ""}`} onClick={() => { setPoemAt(item.savedAt); setMode("read"); }}>
          <span className="poem-row-title">{item.title || "Untitled poem"}</span>
          <span className="poem-row-meta">{item.body.split("\n").filter(Boolean).length} lines</span>
        </button>)}</div> : <EmptyState compact icon={<Feather size={22} />} title="No poems yet" copy="Add the first poem to this collection." action="Add poem" onAction={onAddItem} />}
      </Card>
      <Card className="poem-folio">
        {activePoem
          ? mode === "read"
            ? <div className="poem-reader">
                <div className="poem-reader-head"><h2 className="poem-title">{activePoem.title || "Untitled poem"}</h2><div className="inline-actions"><IconButton label="Edit poem" onClick={() => setMode("edit")}><PenLine size={17} /></IconButton><IconButton label="Delete poem" onClick={() => { onDeleteItem(activePoem.savedAt); setPoemAt(null); }}><Trash2 size={16} /></IconButton></div></div>
                <div className="poem-verse">{activePoem.body || "This poem is still waiting to be written."}</div>
                <button className="button small ghost poem-edit-toggle" type="button" onClick={() => setMode("edit")}><PenLine size={15} />Edit this poem</button>
              </div>
            : <div className="poem-editor">
                <div className="poem-editor-head"><input className="poem-title-input" value={titleDraft} placeholder="Poem title" aria-label="Poem title" onChange={event => setTitleDraft(event.target.value)} /><div className="inline-actions"><button className="button small ghost" type="button" onClick={() => setMode("read")}>Close without saving</button><button className="button small accent" type="button" disabled={titleDraft === activePoem.title && bodyDraft === activePoem.body} onClick={() => { onUpdateItem(activePoem.savedAt, titleDraft, bodyDraft); setMode("read"); }}><Feather size={15} />Save poem</button></div></div>
                <textarea className="poem-body-input" value={bodyDraft} placeholder="Write the poem here — line breaks are kept…" aria-label="Poem body" onChange={event => setBodyDraft(event.target.value)} />
              </div>
          : <EmptyState icon={<Feather size={26} />} title="Choose a poem" copy="Select a poem to read it in quiet, or add a new one." action="Add poem" onAction={onAddItem} />}
      </Card>
    </div>
  </div>;
}

function BlogContent({ collections, selectedId, onSelect, onCreate, onAddItem, onDeleteCollection, onDeleteItem, onUpdateCollection, onUpdateItem }: { collections: WritingCollection[]; selectedId: string; onSelect: (id: string) => void; onCreate: () => void; onAddItem: () => void; onDeleteCollection: (id: string) => void; onDeleteItem: (savedAt: number) => void; onUpdateCollection: (id: string, title: string, description: string) => void; onUpdateItem: (savedAt: number, title: string, body: string) => void }) {
  const blogs = collections.filter(item => item.kind === "blog");
  const selected = blogs.find(item => item.id === selectedId) ?? blogs[0];
  const [postAt, setPostAt] = useState<number | null>(null);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [titleDraft, setTitleDraft] = useState("");
  const [bodyDraft, setBodyDraft] = useState("");
  const [metaDraft, setMetaDraft] = useState({ title: "", description: "" });
  const [editingMeta, setEditingMeta] = useState(false);
  const activePost = selected?.items.find(item => item.savedAt === postAt) ?? null;
  useEffect(() => { setPostAt(null); setMode("edit"); setEditingMeta(false); setMetaDraft({ title: selected?.title ?? "", description: selected?.description ?? "" }); }, [selected?.id]);
  useEffect(() => { setTitleDraft(activePost?.title ?? ""); setBodyDraft(activePost?.body ?? ""); }, [postAt, activePost?.savedAt]);
  const words = bodyDraft.trim() ? bodyDraft.trim().split(/\s+/).length : 0;
  const dateLabel = (savedAt: number) => new Date(savedAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  if (!blogs.length) return <Card className="empty-workspace folio-workspace"><div className="folio-number">01</div><EmptyState icon={<Archive size={32} />} title="Start your blog" copy="Create a blog — its posts stay together, importable and editable." action="Create blog" onAction={onCreate} /></Card>;

  return <div className="blog-desk">
    <aside className="blog-rail">
      <div className="card-header"><h2 className="card-heading">Blogs</h2><IconButton label="Create blog" onClick={onCreate}><Plus size={19} /></IconButton></div>
      {blogs.map(item => <div className={`source-item ${item.id === selected?.id ? "selected" : ""}`} key={item.id}>
        <button type="button" className="source-select" onClick={() => onSelect(item.id)}><div className="list-icon"><Archive size={18} /></div><div><p className="item-title">{item.title}</p><p className="item-detail">{item.items.length} post{item.items.length === 1 ? "" : "s"}</p></div><ChevronRight className="row-right" size={16} /></button>
        <IconButton label={`Delete ${item.title}`} onClick={() => onDeleteCollection(item.id)}><Trash2 size={16} /></IconButton>
      </div>)}
      {selected && <div className="blog-meta">
        {editingMeta
          ? <div className="novel-meta-edit"><input value={metaDraft.title} aria-label="Blog title" placeholder="Blog title" onChange={event => setMetaDraft(current => ({ ...current, title: event.target.value }))} /><textarea value={metaDraft.description} aria-label="Blog description" placeholder="What this blog is about (optional)" rows={2} onChange={event => setMetaDraft(current => ({ ...current, description: event.target.value }))} /><div className="inline-actions"><button className="button small ghost" type="button" onClick={() => { setEditingMeta(false); setMetaDraft({ title: selected.title, description: selected.description }); }}>Cancel</button><button className="button small accent" type="button" onClick={() => { onUpdateCollection(selected.id, metaDraft.title, metaDraft.description); setEditingMeta(false); }}>Save details</button></div></div>
          : <button className="button small ghost novel-meta-edit-btn" type="button" onClick={() => { setMetaDraft({ title: selected.title, description: selected.description }); setEditingMeta(true); }}><Settings2 size={15} />Edit blog details</button>}
      </div>}
    </aside>
    <div className="blog-main">
      <Card className="blog-posts">
        <div className="card-header"><h2 className="card-heading">Posts</h2><IconButton label="Add post" onClick={onAddItem}><Plus size={19} /></IconButton></div>
        {selected && selected.items.length ? <div className="post-list">{selected.items.slice().reverse().map(item => <button type="button" key={item.savedAt} className={`post-row ${item.savedAt === postAt ? "active" : ""}`} onClick={() => { setPostAt(item.savedAt); setMode("edit"); }}>
          <span className="post-row-copy"><strong>{item.title || "Untitled post"}</strong><small>{dateLabel(item.savedAt)} · {item.body.trim() ? `${item.body.trim().split(/\s+/).length.toLocaleString()} words` : "Empty"}</small></span>
          <ChevronRight size={15} />
        </button>)}</div> : <EmptyState compact icon={<Archive size={22} />} title="No posts yet" copy="Write the first post — or import blog HTML." action="Add post" onAction={onAddItem} />}
      </Card>
      <Card className="blog-editor-card">
        {activePost
          ? <div className="post-editor">
              <div className="post-editor-head">
                <input className="post-title-input" value={titleDraft} placeholder="Post title" aria-label="Post title" onChange={event => setTitleDraft(event.target.value)} />
                <div className="inline-actions">
                  <span className="muted tiny">{words.toLocaleString()} words · {dateLabel(activePost.savedAt)}</span>
                  <button className="button small ghost" type="button" onClick={() => setMode(mode === "edit" ? "preview" : "edit")}>{mode === "edit" ? <><FileText size={15} />Preview</> : <><PenLine size={15} />Edit</>}</button>
                  <IconButton label="Delete post" onClick={() => { onDeleteItem(activePost.savedAt); setPostAt(null); }}><Trash2 size={16} /></IconButton>
                  <button className="button small accent" type="button" disabled={titleDraft === activePost.title && bodyDraft === activePost.body} onClick={() => onUpdateItem(activePost.savedAt, titleDraft, bodyDraft)}><Feather size={15} />Save post</button>
                </div>
              </div>
              {mode === "edit"
                ? <textarea className="post-body-input" value={bodyDraft} placeholder="Write the post…" aria-label="Post body" onChange={event => setBodyDraft(event.target.value)} />
                : <div className="post-preview prose-view">{bodyDraft || "Nothing to preview yet."}</div>}
            </div>
          : <EmptyState icon={<PenLine size={26} />} title="Select a post" copy="Choose a post to edit, or add a new one." action="Add post" onAction={onAddItem} />}
      </Card>
    </div>
  </div>;
}

function CollectionContent({ icon, heading, copy, action, items, onAdd, onDelete }: { icon: ReactNode; heading: string; copy: string; action: string; items: SavedTestItem[]; onAdd: () => void; onDelete: (savedAt: number) => void }) {
  return <div className="three-column"><Card className="archive-card"><div className="card-header"><h2 className="card-heading">{heading}</h2><IconButton label={action} onClick={onAdd}><Plus size={19} /></IconButton></div>{items.length ? items.map(item => <ItemRow key={item.savedAt} item={item} icon={icon} onDelete={() => onDelete(item.savedAt)} />) : <EmptyState compact icon={icon} title={`No ${heading.toLowerCase()} yet`} copy={copy} action={action} onAction={onAdd} />}</Card><Card className="folio-panel"><div className="summary">{items.length ? <><h3>{items[0].title}</h3><p>{items[0].body || "Saved locally and ready for your next step."}</p><hr className="summary-divider" /><p className="muted">The Lantern can help you work with this material when a provider is connected.</p></> : <div className="folio-prompt"><div className="folio-mark">{icon}</div><span>FIRST PAGE</span><h3>{heading} is waiting for its first entry</h3><p>{copy}</p><div className="folio-rule" /><button className="button small" type="button" onClick={onAdd}><Plus size={15} />{action}</button></div>}</div></Card></div>;
}

function NotesContent({ notes, activeId, onSelect, onSave, onDelete, onNew }: { notes: SavedTestNote[]; activeId: string; onSelect: (id: string) => void; onSave: (next: SavedTestNote) => void; onDelete: (id: string) => void; onNew?: () => void }) {
  const active = notes.find(item => item.id === activeId) ?? notes[notes.length - 1];
  const [title, setTitle] = useState(active?.title ?? "");
  const [body, setBody] = useState(active?.body ?? "");
  useEffect(() => { setTitle(active?.title ?? ""); setBody(active?.body ?? ""); }, [activeId, active?.title, active?.body]);
  const words = body.trim() ? body.trim().split(/\s+/).length : 0;
  const dirty = active ? (title !== active.title || body !== active.body) : (title.trim() !== "" || body.trim() !== "");
  return <div className="notes-desk">
    <Card className="notes-rail">
      <div className="card-header"><h2 className="card-heading">Notes</h2><IconButton label="New note" onClick={onNew}><Plus size={19} /></IconButton></div>
      {notes.length ? <div className="note-list">{notes.slice().reverse().map(item => <button type="button" key={item.id} className={`note-list-item ${item.id === activeId ? "active" : ""}`} onClick={() => onSelect(item.id)}><span className="note-list-title">{item.title || "Untitled note"}</span><span className="note-list-snippet">{item.body.slice(0, 70) || "Empty note"}</span></button>)}</div> : <EmptyState compact icon={<Lightbulb size={22} />} title="A fresh page" copy="Notes you save will stay in this browser." />}
    </Card>
    <Card className="notes-editor-card">
      <div className="note-editor blank-note">
        <div className="notes-editor-head">
          <input className="note-title-input" value={title} placeholder="Untitled note" onChange={event => setTitle(event.target.value)} aria-label="Note title" />
          <div className="inline-actions">
            <span className="muted tiny">{words.toLocaleString()} words · {dirty ? "Unsaved changes" : "Saved in this browser"}</span>
            {active && <IconButton label="Delete note" onClick={() => onDelete(active.id)}><Trash2 size={16} /></IconButton>}
            <button className="button small accent" disabled={!dirty} onClick={() => onSave({ id: active?.id ?? "", title, body, savedAt: active?.savedAt ?? 0 })}><Feather size={15} />Save note</button>
          </div>
        </div>
        <textarea value={body} placeholder="Begin wherever you are…" onChange={event => setBody(event.target.value)} aria-label="Note content" />
      </div>
    </Card>
  </div>;
}

function WellbeingContent({ checkins, medications, appointment, onSaveCheckin, onDeleteCheckin, onSaveMedication, onDeleteMedication, onSaveAppointment, onClearAppointment }: { checkins: WellbeingCheckin[]; medications: WellbeingMedication[]; appointment: WellbeingAppointmentNote; onSaveCheckin: (input: Omit<WellbeingCheckin, "id" | "savedAt">) => void; onDeleteCheckin: (id: string) => void; onSaveMedication: (input: Omit<WellbeingMedication, "id" | "savedAt">) => void; onDeleteMedication: (id: string) => void; onSaveAppointment: (input: Omit<WellbeingAppointmentNote, "savedAt">) => void; onClearAppointment: () => void }) {
  const [view, setView] = useState<"checkin" | "reports" | "routine">("checkin");
  const [mood, setMood] = useState("");
  const [energy, setEnergy] = useState("");
  const [comforts, setComforts] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [medicineReminder, setMedicineReminder] = useState("");
  const [medicineNote, setMedicineNote] = useState("");
  const [reportRange, setReportRange] = useState<"week" | "month">("week");
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const reportItems = wellbeingReportItems(checkins, reportRange, today);
  const moodCounts = WELLBEING_MOODS.map(label => ({ label, count: reportItems.filter(item => item.mood === label).length }));
  const calendarDays = Array.from({ length: 14 }, (_, index) => { const date = new Date(today); date.setDate(today.getDate() - (13 - index)); return { key: date.toISOString().slice(0, 10), label: date.toLocaleDateString(undefined, { weekday: "short" }), day: date.getDate() }; });
  const toggleComfort = (comfort: string) => setComforts(current => current.includes(comfort) ? current.filter(item => item !== comfort) : [...current, comfort]);
  const saveCheckin = () => { if (!mood && !energy && !comforts.length && !note.trim()) return; onSaveCheckin({ date: todayKey, mood, energy, comforts, note }); setMood(""); setEnergy(""); setComforts([]); setNote(""); };
  return <div className="wellbeing-layout">
    <div className="wellbeing-tabs" role="tablist" aria-label="Wellbeing views"><button className={view === "checkin" ? "active" : ""} type="button" onClick={() => setView("checkin")}>Today</button><button className={view === "reports" ? "active" : ""} type="button" onClick={() => setView("reports")}>Reports</button><button className={view === "routine" ? "active" : ""} type="button" onClick={() => setView("routine")}>Gentle routine</button></div>
    <Card className="wellbeing-affirmation"><div><span className="eyebrow">A small kindness for today</span><h2>{affirmationForDate(today)}</h2><p>You can leave everything else blank. There is no score and no missed day.</p></div><Flower2 size={42} /></Card>
    {view === "checkin" && <div className="wellbeing-grid"><Card><div className="card-header"><h2 className="card-heading">A gentle check-in</h2><span className="muted tiny">{wellbeingDateLabel(today)}</span></div><p className="muted">There is no right way to feel today.</p><label>How are you arriving today?<select value={mood} onChange={event => setMood(event.target.value)}><option value="">Choose one, or leave blank</option>{WELLBEING_MOODS.map(option => <option key={option}>{option}</option>)}</select></label><label>How is your energy?<select value={energy} onChange={event => setEnergy(event.target.value)}><option value="">Choose one, or leave blank</option>{WELLBEING_ENERGY.map(option => <option key={option}>{option}</option>)}</select></label><fieldset className="wellbeing-choices"><legend>Body & comfort <span className="muted tiny">optional</span></legend><div>{WELLBEING_COMFORTS.map(option => <label key={option} className="choice-chip"><input type="checkbox" checked={comforts.includes(option)} onChange={() => toggleComfort(option)} />{option}</label>)}</div></fieldset><label>Private note<textarea value={note} onChange={event => setNote(event.target.value)} placeholder="What would you like to remember?" /></label><button className="button accent" type="button" onClick={saveCheckin}><CheckCircle2 size={16} />Save today’s check-in</button></Card><Card className="wellbeing-calendar-card"><div className="card-header"><h2 className="card-heading">Your wellbeing log</h2><CalendarDays size={18} /></div><p className="muted">Saved check-ins appear here so you can notice your own rhythm.</p><div className="wellbeing-calendar-strip">{calendarDays.map(day => <div className={`wellbeing-day ${day.key === todayKey ? "today" : ""}`} key={day.key}><span>{day.label}</span><strong>{day.day}</strong>{checkins.some(item => item.date === day.key) && <i aria-label="Check-in saved" />}</div>)}</div>{checkins.length ? <div className="wellbeing-history">{checkins.slice().reverse().slice(0, 5).map(item => <div className="wellbeing-history-row" key={item.id}><div><strong>{item.date === todayKey ? "Today" : item.date}</strong><span>{item.mood || "No mood selected"}{item.energy ? ` · ${item.energy}` : ""}</span></div><IconButton label="Delete wellbeing check-in" onClick={() => onDeleteCheckin(item.id)}><Trash2 size={16} /></IconButton></div>)}</div> : <EmptyState compact icon={<CalendarDays size={22} />} title="Your log begins gently" copy="A saved check-in will appear on the calendar." />}</Card></div>}
    {view === "reports" && <div className="wellbeing-report-grid"><Card><div className="card-header"><div><span className="eyebrow">Your own notes, not a diagnosis</span><h2 className="card-heading">Wellbeing report</h2></div><select aria-label="Report range" value={reportRange} onChange={event => setReportRange(event.target.value as "week" | "month")}><option value="week">Past 7 days</option><option value="month">Past 30 days</option></select></div><p className="muted">This view describes what you chose to record. It does not score, predict, or interpret your health.</p>{reportItems.length ? <div className="report-bars">{moodCounts.map(item => <div className="report-bar-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${Math.max(item.count * 18, item.count ? 8 : 0)}%` }} /></div><strong>{item.count}</strong></div>)}</div> : <EmptyState icon={<Flower2 size={28} />} title="A report will grow from your own notes" copy="Save a few optional check-ins and this view will summarise the words you chose." />}</Card><Card><div className="card-header"><h2 className="card-heading">Recorded days</h2><ListChecks size={18} /></div><div className="report-stat"><strong>{reportItems.length}</strong><span>check-ins in this period</span></div><p className="muted">Nothing here is a target. It is simply a little map of what you decided to notice.</p><div className="wellbeing-safety-note"><ShieldCheck size={18} />{WELLBEING_SAFETY_NOTE}</div></Card></div>}
    {view === "routine" && <div className="wellbeing-routine-grid"><Card><div className="card-header"><h2 className="card-heading">Medication list</h2><ShieldCheck size={18} /></div><p className="muted">Keep personal reminders for your own reference. This does not give dosage or medication-change advice.</p><div className="routine-form"><input value={medicineName} onChange={event => setMedicineName(event.target.value)} placeholder="Medicine or supplement name" /><input value={medicineReminder} onChange={event => setMedicineReminder(event.target.value)} placeholder="Personal reminder label" /><textarea value={medicineNote} onChange={event => setMedicineNote(event.target.value)} placeholder="Optional note for your own reference" /><button className="button accent" type="button" onClick={() => { if (!medicineName.trim()) return; onSaveMedication({ name: medicineName, reminder: medicineReminder, note: medicineNote }); setMedicineName(""); setMedicineReminder(""); setMedicineNote(""); }}><Plus size={16} />Add to my list</button></div>{medications.map(item => <div className="wellbeing-history-row" key={item.id}><div><strong>{item.name}</strong><span>{item.reminder || "Personal reference"}</span></div><IconButton label={`Delete ${item.name}`} onClick={() => onDeleteMedication(item.id)}><Trash2 size={16} /></IconButton></div>)}</Card><Card className="appointment-card"><div className="card-header"><h2 className="card-heading">Preparing for an appointment</h2><FileText size={18} /></div><p className="muted">A few words can make a conversation easier to begin.</p><div className="appointment-fields"><label>What changed?<textarea value={appointment.changed} onChange={event => onSaveAppointment({ ...appointment, changed: event.target.value })} placeholder="A change you want to mention" /></label><label>What helped?<textarea value={appointment.helped} onChange={event => onSaveAppointment({ ...appointment, helped: event.target.value })} placeholder="Anything you want to remember" /></label><label>What would you like to ask?<textarea value={appointment.questions} onChange={event => onSaveAppointment({ ...appointment, questions: event.target.value })} placeholder="Questions for a qualified clinician" /></label></div><div className="appointment-actions"><button className="button ghost danger" type="button" onClick={onClearAppointment}><Trash2 size={16} />Clear discussion note</button></div></Card></div>}
    <p className="wellbeing-footer-note">{WELLBEING_SAFETY_NOTE}</p>
  </div>;
}

function SettingsContent({ providers, onAddProvider, onRemoveProvider, soul, onSaveSoul, onClearSoul }: { providers: SavedProviderPreference[]; onAddProvider: () => void; onRemoveProvider: (id: string) => void; soul: string; onSaveSoul: (body: string) => void; onClearSoul: () => void }) {
  const [section, setSection] = useState<"profile" | "soul" | "privacy" | "providers">("profile");
  const [soulDraft, setSoulDraft] = useState(soul);
  const nav = (id: typeof section, icon: ReactNode, label: string) => <button className={section === id ? "active" : ""} type="button" onClick={() => setSection(id)}>{icon}{label}</button>;
  return <div className="settings-layout"><Card className="settings-nav">{nav("profile", <StickyNote size={18} />, "Your profile")}{nav("soul", <Feather size={18} />, "Soul.md")}{nav("privacy", <ShieldCheck size={18} />, "Privacy & storage")}{nav("providers", <Sparkles size={18} />, "Assistant providers")}</Card><Card className="settings-content">
    {section === "profile" && <div className="settings-section"><h3>Your profile</h3><p>These details are optional. They help shape a workspace that feels like yours.</p><div className="field"><label htmlFor="preferred-name">Preferred name</label><input id="preferred-name" placeholder="Add a name when you are ready" /></div><button className="button small" type="button" onClick={() => setSection("soul")}><Feather size={15} />Write Soul.md</button></div>}
    {section === "soul" && <div className="settings-section"><h3>Soul.md</h3><p>Write the tone, values, and ways of working you want the Lantern to respect. It is private to this browser for now.</p><label className="soul-editor-label">Personal guidance<textarea value={soulDraft} placeholder="For example: Speak gently, leave room for reflection, and help me find meaning without rushing me." onChange={event => setSoulDraft(event.target.value)} /></label><div className="note-actions"><span className="muted tiny">Saved only when you choose Save Soul.md.</span><div className="inline-actions"><button className="button ghost danger" type="button" onClick={() => { setSoulDraft(""); onClearSoul(); }}><Trash2 size={16} />Clear Soul.md</button><button className="button accent" type="button" onClick={() => onSaveSoul(soulDraft)}><Feather size={16} />Save Soul.md</button></div></div></div>}
    {section === "providers" && <div className="settings-section"><div className="settings-section-head"><div><h3>Assistant providers</h3><p>Connect an online model — Mistral, OpenRouter, OpenAI, or Google Gemini. Test the key to fetch its models, then save the connection. The key, model, and endpoint are stored only in this browser.</p></div><button className="button small" type="button" onClick={onAddProvider}><Plus size={15} />Add provider</button></div>{providers.length ? <div className="provider-list">{providers.map(provider => <div className="provider-card" key={provider.id}><div><strong>{provider.label}</strong><span>{provider.kind}{provider.model ? ` · ${provider.model}` : ""}</span>{provider.endpoint && <span>{provider.endpoint}</span>}<small>Stored in this browser only.</small></div><IconButton label={`Delete ${provider.label}`} onClick={() => onRemoveProvider(provider.id)}><Trash2 size={17} /></IconButton></div>)}</div> : <div className="provider-empty"><Sparkles size={24} /><div><strong>No providers connected yet</strong><p>Add a provider, paste its API key, then choose from the models it returns.</p></div><button className="button small" type="button" onClick={onAddProvider}><Plus size={15} />Connect provider</button></div>}<div className="connection-status secure-connection"><ShieldCheck size={22} color="var(--accent)" /><div><strong>Online models, private keys</strong><p>The Lantern calls your chosen provider through this app's own server proxy. Your key never leaves this browser except to make the request.</p></div></div></div>}
    {section === "privacy" && <div className="settings-section"><h3>Privacy & storage</h3><p>Your content and provider settings are stored only in this browser's local storage. Nothing is sent to a cloud database.</p><div className="connection-status"><Cloud size={22} color="var(--accent)" /><div><strong>Local-only storage</strong><p>Notes, notebooks, writing, wellbeing records, Soul.md, and your model connection all live in this browser. Clearing site data removes them.</p></div></div><div className="connection-status"><ShieldCheck size={22} color="var(--accent)" /><div><strong>What the model sees</strong><p>The Lantern sends your current workspace context and messages to the provider you configured, through this app's own server proxy. Your key stays in this browser.</p></div></div></div>}
  </Card></div>;
}

function ContentForTab({ tab, notes, activeNoteId, onSelectNote, onSaveNote, onDeleteNote, onNewNote, collections, writingCollections, writingSelection, onSelectWriting, onCreateWriting, notebook, notebooks, onSelectNotebook, onCreateNotebook, onAdd, onDeleteCollectionItem, onDeleteWritingCollection, onUpdateWritingCollection, onUpdateWritingItem, onDeleteNotebook, onDeleteSource, onSaveNotebookNotes, onAddDocument, onDeleteDocument, onUpdateNotebookTitle, providers, onAddProvider, onRemoveProvider, soul, onSaveSoul, onClearSoul, wellbeingCheckins, wellbeingMedications, wellbeingAppointment, onSaveWellbeingCheckin, onDeleteWellbeingCheckin, onSaveWellbeingMedication, onDeleteWellbeingMedication, onSaveWellbeingAppointment, onClearWellbeingAppointment }: { tab: LanternTab; notes: SavedTestNote[]; activeNoteId: string; onSelectNote: (id: string) => void; onSaveNote: (note: SavedTestNote) => void; onDeleteNote: (id: string) => void; onNewNote: () => void; collections: SavedTestCollections; writingCollections: WritingCollection[]; writingSelection: Partial<Record<WritingCollectionKind, string>>; onSelectWriting: (kind: WritingCollectionKind, id: string) => void; onCreateWriting: (kind: WritingCollectionKind) => void; notebook?: SavedTestNotebook; notebooks: SavedTestNotebook[]; onSelectNotebook: (id: string) => void; onCreateNotebook: () => void; onAdd: () => void; onDeleteCollectionItem: (savedAt: number) => void; onDeleteWritingCollection: (id: string) => void; onUpdateWritingCollection: (id: string, title: string, description: string) => void; onUpdateWritingItem: (savedAt: number, title: string, body: string) => void; onDeleteNotebook: (id: string) => void; onDeleteSource: (savedAt: number) => void; onSaveNotebookNotes: (notes: string) => void; onAddDocument: (title: string, content: string) => void; onDeleteDocument: (savedAt: number) => void; onUpdateNotebookTitle: (title: string, description: string) => void; providers: SavedProviderPreference[]; onAddProvider: () => void; onRemoveProvider: (id: string) => void; soul: string; onSaveSoul: (body: string) => void; onClearSoul: () => void; wellbeingCheckins: WellbeingCheckin[]; wellbeingMedications: WellbeingMedication[]; wellbeingAppointment: WellbeingAppointmentNote; onSaveWellbeingCheckin: (input: Omit<WellbeingCheckin, "id" | "savedAt">) => void; onDeleteWellbeingCheckin: (id: string) => void; onSaveWellbeingMedication: (input: Omit<WellbeingMedication, "id" | "savedAt">) => void; onDeleteWellbeingMedication: (id: string) => void; onSaveWellbeingAppointment: (input: Omit<WellbeingAppointmentNote, "savedAt">) => void; onClearWellbeingAppointment: () => void; }) {
  if (tab === "today") return <TodayContent items={collections.today ?? []} onAdd={onAdd} onDelete={onDeleteCollectionItem} wellbeingCheckins={wellbeingCheckins} />;
  if (tab === "notebooks") return <NotebooksContent notebook={notebook} notebooks={notebooks} onSelectNotebook={onSelectNotebook} onCreateNotebook={onCreateNotebook} onAddSource={onAdd} onDeleteNotebook={onDeleteNotebook} onDeleteSource={onDeleteSource} onSaveNote={onSaveNotebookNotes} onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument} onUpdateNotebookTitle={onUpdateNotebookTitle} providers={providers} />;

  if (tab === "novel") return <NovelContent collections={writingCollections} selectedId={writingSelection.novel ?? ""} onSelect={id => onSelectWriting("novel", id)} onCreate={() => onCreateWriting("novel")} onAddItem={onAdd} onDeleteCollection={onDeleteWritingCollection} onDeleteItem={onDeleteCollectionItem} onUpdateCollection={onUpdateWritingCollection} onUpdateItem={onUpdateWritingItem} />;
  if (tab === "poems") return <PoemsContent collections={writingCollections} selectedId={writingSelection.poems ?? ""} onSelect={id => onSelectWriting("poems", id)} onCreate={() => onCreateWriting("poems")} onAddItem={onAdd} onDeleteCollection={onDeleteWritingCollection} onDeleteItem={onDeleteCollectionItem} onUpdateCollection={onUpdateWritingCollection} onUpdateItem={onUpdateWritingItem} />;
  if (tab === "blog") return <BlogContent collections={writingCollections} selectedId={writingSelection.blog ?? ""} onSelect={id => onSelectWriting("blog", id)} onCreate={() => onCreateWriting("blog")} onAddItem={onAdd} onDeleteCollection={onDeleteWritingCollection} onDeleteItem={onDeleteCollectionItem} onUpdateCollection={onUpdateWritingCollection} onUpdateItem={onUpdateWritingItem} />;
  if (tab === "notes") return <NotesContent notes={notes} activeId={activeNoteId} onSelect={onSelectNote} onSave={onSaveNote} onDelete={onDeleteNote} onNew={onNewNote} />;
  if (tab === "wellbeing") return <WellbeingContent checkins={wellbeingCheckins} medications={wellbeingMedications} appointment={wellbeingAppointment} onSaveCheckin={onSaveWellbeingCheckin} onDeleteCheckin={onDeleteWellbeingCheckin} onSaveMedication={onSaveWellbeingMedication} onDeleteMedication={onDeleteWellbeingMedication} onSaveAppointment={onSaveWellbeingAppointment} onClearAppointment={onClearWellbeingAppointment} />;
  return <SettingsContent providers={providers} onAddProvider={onAddProvider} onRemoveProvider={onRemoveProvider} soul={soul} onSaveSoul={onSaveSoul} onClearSoul={onClearSoul} />;
}

function LanternPanel({ tab, reply, onSuggestion, onExpand, onCollapse }: { tab: TabSpec; reply: string | null; onSuggestion: (suggestion: string) => void; onExpand: () => void; onCollapse: () => void }) {
  return <aside className="card lantern-panel" id="lantern-panel"><div className="lantern-head"><h2 className="lantern-title">The Lantern</h2><IconButton label="Collapse Lantern panel" onClick={onCollapse}><PanelRightClose size={18} /></IconButton></div><img className="lantern-art" src={LANTERN_EMBLEM} alt="Pana’s Lantern emblem" /><div className="lantern-context"><span>You are in:</span><strong>{tab.label}</strong></div><p className="lantern-copy">{tabAssistantCopy[tab.id]}</p><div className="suggestions">{tab.suggestions.map(suggestion => <button className="suggestion" key={suggestion} onClick={() => onSuggestion(suggestion)}><Sparkles size={17} color="var(--accent)" />{suggestion}<ChevronRight size={16} /></button>)}</div>{reply && <div className="lantern-reply">{reply}</div>}<button className="button small" style={{ marginTop: 15, width: "100%", justifyContent: "center" }} onClick={onExpand}><MessageSquareText size={16} />Chat with The Lantern</button></aside>;
}

const emphasisPattern = /(\b(?:built|outworked|carried|deserve|earned|fighting|survived|hustle|devotion|willpower|refuses?|everything|nothing|no one|yourself|strength|power|enough|always|never|still|today)\b)/gi;
const emphasisSimple = /^(?:built|outworked|carried|deserve|earned|fighting|survived|hustle|devotion|willpower|refuses?|everything|nothing|no one|yourself|strength|power|enough|always|never|still|today)$/i;

function formatAffirmation(raw: string) {
  const parts = raw.split(emphasisPattern);
  return <>
    {parts.map((part, i) => {
      if (part === '') return null;
      if (emphasisSimple.test(part)) {
        return <strong key={i}><em>{part}</em></strong>;
      }
      return <span key={i}>{part}</span>;
    })}
  </>;
}

function LanternSplash({ onEnter }: { onEnter: () => void }) {
  const [affirmation] = useState(() => nextSplashAffirmation());
  return <main className="lantern-splash" aria-labelledby="splash-title">
    <div className="splash-stars" aria-hidden="true"><i /><i /><i /><i /><i /></div>
    <div className="splash-vine splash-vine-left" aria-hidden="true"><Flower2 /><Feather /><Flower2 /></div>
    <div className="splash-vine splash-vine-right" aria-hidden="true"><Flower2 /><Feather /><Flower2 /></div>
    <div className="splash-sky">
      <div className="splash-quote-morning">
        <span className="splash-quote-mark splash-quote-mark-open">"</span>
        <p className="splash-quote-text">{formatAffirmation(affirmation)}</p>
        <span className="splash-quote-mark splash-quote-mark-close">"</span>
      </div>
    </div>
    <div className="splash-content">
      <p className="splash-kicker">A quiet place for ideas</p>
      <h1 id="splash-title">Pana’s Lantern</h1>
      <p className="splash-subtitle">A light for research, writing, and remembering.</p>
      <button className="splash-enter" type="button" onClick={onEnter}><span>Enter Pana’s Lantern</span><ArrowUpRight size={18} aria-hidden="true" /></button>
      <p className="splash-hint">Take your time. Everything begins where you are.</p>
    </div>
  </main>;
}

export default function Home() {
  const reviewParam = typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("reviewTab");
  const reviewTab = tabs.some(item => item.id === reviewParam) ? reviewParam as LanternTab : null;
  const [activeTab, setActiveTab] = useState<LanternTab>(() => reviewTab ?? "today");
  const [showSplash, setShowSplash] = useState(() => !reviewTab);

  const [modal, setModal] = useState(false);
  const [lanternReply, setLanternReply] = useState<string | null>(null);
  const [expandedChat, setExpandedChat] = useState(false);
  const [notes, setNotes] = useState<SavedTestNote[]>(() => loadTestNotes());
  const [activeNoteId, setActiveNoteId] = useState<string>(() => loadTestNotes()[loadTestNotes().length - 1]?.id ?? "");
  const [collections, setCollections] = useState<SavedTestCollections>(() => loadTestCollections());
  const [writingCollections, setWritingCollections] = useState<WritingCollection[]>(() => loadWritingCollections(loadTestCollections()));
  const [writingSelection, setWritingSelection] = useState<Partial<Record<WritingCollectionKind, string>>>({});
  const [writingModalKind, setWritingModalKind] = useState<WritingCollectionKind | null>(null);
  useEffect(() => { setWritingSelection(current => { let changed = false; const next = { ...current }; (["novel", "blog", "poems"] as WritingCollectionKind[]).forEach(kind => { const selected = writingCollections.find(item => item.id === next[kind] && item.kind === kind); if (!selected) { const fallback = writingCollections.find(item => item.kind === kind); if (next[kind] !== (fallback?.id ?? "")) { next[kind] = fallback?.id ?? ""; changed = true; } } }); return changed ? next : current; }); }, [writingCollections]);
  const [notebooks, setNotebooks] = useState<SavedTestNotebook[]>(() => loadTestNotebooks());
  const [activeNotebookId, setActiveNotebookId] = useState(() => loadTestNotebooks()[0]?.id ?? "");
  const [notebookModal, setNotebookModal] = useState(false);
  const [providerModal, setProviderModal] = useState(false);
  const [providerPreferences, setProviderPreferences] = useState<SavedProviderPreference[]>(() => loadProviderPreferences());
  const [soul, setSoul] = useState(() => loadSoul());
  const [wellbeingCheckins, setWellbeingCheckins] = useState<WellbeingCheckin[]>(() => loadWellbeingCheckins());
  const [wellbeingMedications, setWellbeingMedications] = useState<WellbeingMedication[]>(() => loadWellbeingMedications());
  const [wellbeingAppointment, setWellbeingAppointment] = useState<WellbeingAppointmentNote>(() => loadWellbeingAppointment());
  const [lanternCollapsed, setLanternCollapsed] = useState(() => typeof window !== "undefined" && localStorage.getItem("pannas-lantern:lantern-collapsed") === "true");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => typeof window !== "undefined" && localStorage.getItem("pannas-lantern:sidebar-collapsed") === "true");
  const tab = useMemo(() => tabs.find(item => item.id === activeTab) ?? tabs[0], [activeTab]);
  const activeNotebook = notebooks.find(item => item.id === activeNotebookId) ?? notebooks[0];
  const pageHeading = activeTab === "notebooks" && activeNotebook ? activeNotebook.title : tab.label;
  const style = { "--accent": tab.accent, "--accent-soft": tab.soft } as CSSProperties;
  const [pendingActions, setPendingActions] = useState<LanternActionProposal[]>([]);
  const [researchMode, setResearchMode] = useState(false);
  const [lanternBusy, setLanternBusy] = useState(false);
  const [chatSessions, setChatSessions] = useState<Record<string, ChatSessionEntry[]>>(() => loadChatSessions());
  const messages = chatSessions[activeTab] ?? [];
  const setTabMessages = (updater: (current: ChatSessionEntry[]) => ChatSessionEntry[], tab: LanternTab = activeTab) => {
    setChatSessions(current => {
      const next = { ...current, [tab]: updater(current[tab] ?? []) };
      saveChatSessions(next);
      return next;
    });
  };
  const clearActiveChat = () => setTabMessages(() => []);
  const clearAllChats = () => { setChatSessions({}); saveChatSessions({}); setLanternReply(null); };
  const writingKind = (["novel", "blog", "poems"] as LanternTab[]).includes(activeTab) ? activeTab as WritingCollectionKind : null;
  const selectedWritingCollection = selectedWritingAssistantContext(writingCollections, writingKind, writingKind ? writingSelection[writingKind] : undefined);
  const workspaceContext = useMemo(() => buildPageWorkspaceContext({
    tab: activeTab,
    pageHeading,
    collections,
    notes,
    activeNoteId,
    notebook: activeNotebook ?? null,
    notebooks,
    writingCollections,
    selectedWritingCollection,
    wellbeingCheckins,
    wellbeingMedications,
    wellbeingAppointment,
    soul: soul.body,
    providers: providerPreferences.map(provider => ({ label: provider.label, kind: provider.kind, model: provider.model, endpoint: provider.endpoint })),
  }), [activeTab, pageHeading, notes, activeNoteId, activeNotebook, notebooks, collections, writingCollections, selectedWritingCollection, wellbeingCheckins, wellbeingMedications, wellbeingAppointment, soul, providerPreferences]);
  const addLabel = activeTab === "settings" ? "Add provider" : activeTab === "wellbeing" ? "Start check-in" : activeTab === "blog" ? "Create blog" : activeTab === "poems" ? "Create collection" : activeTab === "novel" ? "Create novel" : activeTab === "notebooks" ? "Add source" : activeTab === "notes" ? "New note" : "Add";

  const onSuggestion = (suggestion: string) => onChat(suggestion);
  const onCreateWritingCollection = (kind: WritingCollectionKind, title: string, description: string, firstItem?: SavedTestItem) => { const created = createWritingCollection(kind, title, description, firstItem); const next = [...writingCollections, created]; setWritingCollections(next); saveWritingCollections(next); setWritingSelection(current => ({ ...current, [kind]: created.id })); setWritingModalKind(null); setLanternReply(`Your ${kind === "novel" ? "novel" : kind === "blog" ? "blog" : "poems collection"} is ready.`); };
  const onDeleteWritingCollection = (id: string) => { const removed = writingCollections.find(item => item.id === id); const next = writingCollections.filter(item => item.id !== id); setWritingCollections(next); saveWritingCollections(next); if (removed) setWritingSelection(current => ({ ...current, [removed.kind]: next.find(item => item.kind === removed.kind)?.id ?? "" })); setLanternReply("That collection was deleted from this browser."); };
  const onUpdateWritingCollection = (id: string, title: string, description: string) => { const next = writingCollections.map(item => item.id === id ? updateWritingCollection(item, title, description) : item); setWritingCollections(next); saveWritingCollections(next); setLanternReply("Details saved."); };
  const onUpdateWritingItem = (savedAt: number, title: string, body: string) => { if (!writingKind) return; const selected = writingCollections.find(item => item.id === writingSelection[writingKind] && item.kind === writingKind) ?? writingCollections.find(item => item.kind === writingKind); if (!selected) return; const next = writingCollections.map(item => item.id === selected.id ? updateWritingItemInCollection(item, savedAt, title, body) : item); setWritingCollections(next); saveWritingCollections(next); setLanternReply("Saved."); };
  const applyAssistantAction = (action: LanternActionProposal) => {
    const payload = action.payload ?? {};
    if (action.type === "open_tab" && tabs.some(item => item.id === payload.tab)) { setActiveTab(payload.tab as LanternTab); setExpandedChat(false); return; }
    if (action.type === "open_add_dialog") { if (payload.tab && tabs.some(item => item.id === payload.tab)) setActiveTab(payload.tab as LanternTab); setModal(true); return; }
    if (action.type === "open_provider_setup") { setActiveTab("settings"); setProviderModal(true); return; }
    if (action.type === "create_note") { const saved = saveTestNote({ id: "", title: payload.title ?? "Untitled note", body: payload.body ?? "", savedAt: 0 }); setNotes(current => [...current.filter(item => item.id !== saved.id), saved]); setActiveNoteId(saved.id); return; }
    if (action.type === "create_notebook") { onCreateNotebook(payload.title ?? "New notebook", payload.description ?? ""); return; }
    if (action.type === "create_item") { const target = tabs.some(item => item.id === payload.tab) ? payload.tab as LanternTab : activeTab; setActiveTab(target); onAddItem(payload.title ?? "New item", payload.body ?? ""); return; }
    if (action.type === "save_soul") { onSaveSoul(payload.body ?? ""); return; }
    if (action.type === "delete_note") { if (activeNoteId) { const next = deleteTestNote(activeNoteId); setNotes(next); setActiveNoteId(next[next.length - 1]?.id ?? ""); } return; }
    if (action.type === "delete_item") { if (payload.tab && tabs.some(item => item.id === payload.tab)) setActiveTab(payload.tab as LanternTab); onDeleteCollectionItem(Number(payload.savedAt)); return; }
    if (action.type === "delete_notebook") { onDeleteNotebook(payload.id ?? ""); return; }
    if (action.type === "delete_source") { onDeleteSource(Number(payload.savedAt)); return; }
    if (action.type === "delete_wellbeing_record") { if (payload.kind === "medication") onDeleteWellbeingMedication(payload.id ?? ""); else onDeleteWellbeingCheckin(payload.id ?? ""); }
  };
  const onSaveNote = (next: SavedTestNote) => { const saved = saveTestNote(next); setNotes(current => [...current.filter(item => item.id !== saved.id), saved]); setActiveNoteId(saved.id); setLanternReply("Your note is saved in this browser."); };
  const onAddItem = (title: string, body: string) => {
    if (writingKind) { const selected = writingCollections.find(item => item.id === writingSelection[writingKind] && item.kind === writingKind) ?? writingCollections.find(item => item.kind === writingKind); if (!selected) { setModal(false); setWritingModalKind(writingKind); return; } setWritingSelection(current => ({ ...current, [writingKind]: selected.id })); const next = writingCollections.map(item => item.id === selected.id ? addItemToWritingCollection(item, createTestItem(title, body)) : item); setWritingCollections(next); saveWritingCollections(next); setModal(false); setLanternReply("Saved beneath the selected collection in this browser."); return; }
    if (activeTab === "notebooks" && !activeNotebook) { setModal(false); setNotebookModal(true); return; }
    if (activeTab === "notes") { onSaveNote({ id: "", title, body, savedAt: 0 }); setModal(false); return; }
    const item = createTestItem(title, body);
    if (activeTab === "notebooks" && activeNotebook) {
      const nextNotebooks = notebooks.map(notebook => notebook.id === activeNotebook.id ? addSourceToTestNotebook(notebook, item) : notebook);
      setNotebooks(nextNotebooks); saveTestNotebooks(nextNotebooks); setModal(false); setLanternReply("Your source is saved with this notebook."); return;
    }
    const next = { ...collections, [activeTab]: [...(collections[activeTab] ?? []), item] };
    setCollections(next); saveTestCollections(next); setModal(false); setLanternReply("Saved locally in this browser.");
  };

  const onCreateNotebook = (title: string, description: string) => {
    const notebook = createTestNotebook(title, description); const nextNotebooks = [...notebooks, notebook];
    setNotebooks(nextNotebooks); saveTestNotebooks(nextNotebooks); setActiveNotebookId(notebook.id); setNotebookModal(false); setLanternReply("Your notebook is ready for its first source.");
  };

  const onAddDocument = (title: string, content: string) => {
    if (!activeNotebook) return;
    const doc: SavedTestItem = { title, body: content, savedAt: Date.now() };
    const next = notebooks.map(nb => nb.id === activeNotebook.id ? { ...nb, documents: [...(nb.documents ?? []), doc], updatedAt: Date.now() } : nb);
    setNotebooks(next); saveTestNotebooks(next); setLanternReply("Document added to notebook.");
  };

  const onDeleteDocument = (savedAt: number) => {
    if (!activeNotebook) return;
    const next = notebooks.map(nb => nb.id === activeNotebook.id ? { ...nb, documents: (nb.documents ?? []).filter(d => d.savedAt !== savedAt), updatedAt: Date.now() } : nb);
    setNotebooks(next); saveTestNotebooks(next); setLanternReply("Document deleted from notebook.");
  };

  const onUpdateNotebookTitle = (title: string, description: string) => {
    if (!activeNotebook) return;
    const next = notebooks.map(nb => nb.id === activeNotebook.id ? { ...nb, title, description, updatedAt: Date.now() } : nb);
    setNotebooks(next); saveTestNotebooks(next);
  };
  const onSaveProvider = (input: Pick<SavedProviderPreference, "kind" | "label" | "model" | "endpoint" | "apiKey">) => { const next = [...providerPreferences, createProviderPreference(input)]; setProviderPreferences(next); saveProviderPreferences(next); setProviderModal(false); setLanternReply("Your model connection is saved in this browser. The Lantern will use it now."); };
  const onRemoveProvider = (id: string) => { const next = removeProviderPreference(providerPreferences, id); setProviderPreferences(next); saveProviderPreferences(next); setLanternReply("Provider preference deleted from this browser."); };
  const onDeleteCollectionItem = (savedAt: number) => { if (writingKind) { const selected = writingCollections.find(item => item.id === writingSelection[writingKind] && item.kind === writingKind) ?? writingCollections.find(item => item.kind === writingKind); if (!selected) return; setWritingSelection(current => ({ ...current, [writingKind]: selected.id })); const next = writingCollections.map(item => item.id === selected.id ? { ...item, items: item.items.filter(child => child.savedAt !== savedAt), updatedAt: Date.now() } : item); setWritingCollections(next); saveWritingCollections(next); setLanternReply("Entry deleted from this browser."); return; } const next = { ...collections, [activeTab]: removeTestItem(collections[activeTab] ?? [], savedAt) }; setCollections(next); saveTestCollections(next); setLanternReply("Item deleted from this browser."); };
  const onDeleteNotebook = (id: string) => { const next = notebooks.filter(notebook => notebook.id !== id); setNotebooks(next); saveTestNotebooks(next); setActiveNotebookId(next[0]?.id ?? ""); setLanternReply("Notebook deleted from this browser."); };
  const onSaveNotebookNotes = (notes: string) => { if (!activeNotebook) return; const next = notebooks.map(notebook => notebook.id === activeNotebook.id ? updateTestNotebookNotes(notebook, notes) : notebook); setNotebooks(next); saveTestNotebooks(next); setLanternReply("Notebook notes saved in this browser."); };
  const onDeleteSource = (savedAt: number) => { if (!activeNotebook) return; const next = notebooks.map(notebook => notebook.id === activeNotebook.id ? removeSourceFromTestNotebook(notebook, savedAt) : notebook); setNotebooks(next); saveTestNotebooks(next); setLanternReply("Source deleted from this browser."); };
  const onDeleteNote = (id: string) => { const next = deleteTestNote(id); setNotes(next); setActiveNoteId(next[next.length - 1]?.id ?? ""); setLanternReply("Note deleted from this browser."); };
  const onSelectNote = (id: string) => { setActiveNoteId(id); };
  const onNewNote = () => { const created = { id: "", title: "", body: "", savedAt: 0 }; const saved = saveTestNote(created); setNotes(current => [...current.filter(item => item.id !== saved.id), saved]); setActiveNoteId(saved.id); };
  const onSaveSoul = (body: string) => { const next = { body, savedAt: Date.now() }; setSoul(next); saveSoul(next); setLanternReply("Soul.md is saved in this browser."); };
  const onClearSoul = () => { const empty = { body: "", savedAt: 0 }; setSoul(empty); clearSoul(); setLanternReply("Soul.md deleted from this browser."); };
  const onSaveWellbeingCheckin = (input: Omit<WellbeingCheckin, "id" | "savedAt">) => { const saved = saveWellbeingCheckin(input); const next = [...wellbeingCheckins.filter(item => item.date !== input.date), saved]; setWellbeingCheckins(next); setLanternReply("Your check-in is saved in this browser."); };
  const onDeleteWellbeingCheckin = (id: string) => { const next = removeWellbeingCheckin(wellbeingCheckins, id); setWellbeingCheckins(next); saveWellbeingCheckins(next); setLanternReply("Your wellbeing check-in was deleted."); };
  const onSaveWellbeingMedication = (input: Omit<WellbeingMedication, "id" | "savedAt">) => { const saved = saveWellbeingMedication(input); setWellbeingMedications(current => [saved, ...current]); setLanternReply("Your private routine note is saved in this browser."); };
  const onDeleteWellbeingMedication = (id: string) => { const next = removeWellbeingMedication(wellbeingMedications, id); setWellbeingMedications(next); saveWellbeingMedications(next); setLanternReply("Your routine note was deleted."); };
  const onSaveWellbeingAppointment = (input: Omit<WellbeingAppointmentNote, "savedAt">) => { const saved = saveWellbeingAppointmentNote(input); setWellbeingAppointment(saved); };
  const onClearWellbeingAppointment = () => { const empty = { changed: "", helped: "", questions: "", savedAt: 0 }; setWellbeingAppointment(empty); saveWellbeingAppointment(empty); setLanternReply("Your discussion note was cleared."); };
  const setLanternPanelCollapsed = (collapsed: boolean) => { setLanternCollapsed(collapsed); try { localStorage.setItem("pannas-lantern:lantern-collapsed", String(collapsed)); } catch { /* The control remains usable for this session. */ } };
  const setSidebarPanelCollapsed = (collapsed: boolean) => { setSidebarCollapsed(collapsed); try { localStorage.setItem("pannas-lantern:sidebar-collapsed", String(collapsed)); } catch { /* The control remains usable for this session. */ } };
  const activeProviderRef = () => activeProvider(providerPreferences);
  const [lanternError, setLanternError] = useState<string | null>(null);
  const onChat = async (content: string, research = researchMode) => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const provider = activeProviderRef();
    if (!provider || !provider.model) {
      setLanternReply("Connect a model in Settings › Assistant providers first.");
      setLanternError("no-provider");
      setProviderModal(true);
      return;
    }
    setLanternError(null);
    setLanternBusy(true);
    const chatTab = activeTab;
    setTabMessages(current => [...current, { role: "user", content: trimmed }], chatTab);
    try {
      const result = await assistLantern({
        tab: chatTab,
        prompt: trimmed,
        workspace: workspaceContext,
        recentMessages: (chatSessions[chatTab] ?? []).slice(-8),
        research,
        provider: { kind: provider.kind, endpoint: provider.endpoint, apiKey: provider.apiKey, model: provider.model },
      });
      setTabMessages(current => [...current, { role: "assistant", content: result.answer }]);
      setLanternReply(result.status);
      setPendingActions(result.actions);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setTabMessages(current => [...current, { role: "assistant", content: `I couldn’t complete that request. ${message}` }]);
      setLanternReply("The Lantern needs another try for that request.");
    } finally {
      setLanternBusy(false);
    }
  };

  if (showSplash) return <LanternSplash onEnter={() => setShowSplash(false)} />;

  return <div className="lantern-app" style={style}>
    <div className={`app-shell ${sidebarCollapsed ? "sidebar-is-collapsed" : ""}`}><aside className={`sidebar ${sidebarCollapsed ? "sidebar-collapsed" : ""}`}><div className="brand"><img className="brand-mark" src={LANTERN_EMBLEM} alt="" /><div className="sidebar-brand-copy"><div className="brand-name">Pana’s<br />Lantern</div><div className="brand-subtitle">Research · writing · remembering</div></div></div><button className="sidebar-toggle" type="button" aria-label={sidebarCollapsed ? "Expand navigation sidebar" : "Collapse navigation sidebar"} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarPanelCollapsed(!sidebarCollapsed)}>{sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}<span>{sidebarCollapsed ? "Expand navigation" : "Collapse navigation"}</span></button><nav className="main-nav" aria-label="Pana’s Lantern sections">{tabs.map(item => { const Icon = item.icon; return <button key={item.id} className={`nav-button ${item.id === activeTab ? "active" : ""} ${item.id === "settings" ? "settings" : ""}`} aria-label={item.label} title={sidebarCollapsed ? item.label : undefined} onClick={() => { setActiveTab(item.id); setLanternReply(null); }}><Icon size={20} /><span>{item.label}</span></button>; })}</nav><div className="sidebar-garden"><Flower2 size={23} /><Feather size={19} /><Flower2 size={16} /></div></aside>
      <main className="workspace"><header className="topbar"><div><div className="crumb">{tab.crumb}</div><h1 className="page-title">{pageHeading}</h1><p className="page-lede">{tab.subtitle}</p></div><div className="top-actions"><button className="button" onClick={() => activeTab === "settings" ? setProviderModal(true) : writingKind ? setWritingModalKind(writingKind) : setModal(true)}><Plus size={18} />{addLabel}</button><button className="button accent" onClick={() => setExpandedChat(true)}><Sparkles size={18} />Ask the Lantern</button></div></header>
        <div className={`page-grid ${lanternCollapsed ? "lantern-collapsed" : ""}`}><div className="content-area"><ContentForTab tab={activeTab} notes={notes} activeNoteId={activeNoteId} onSelectNote={onSelectNote} onSaveNote={onSaveNote} onDeleteNote={onDeleteNote} onNewNote={onNewNote} collections={collections} writingCollections={writingCollections} writingSelection={writingSelection} onSelectWriting={(kind, id) => setWritingSelection(current => ({ ...current, [kind]: id }))} onCreateWriting={kind => setWritingModalKind(kind)} onDeleteWritingCollection={onDeleteWritingCollection} onUpdateWritingCollection={onUpdateWritingCollection} onUpdateWritingItem={onUpdateWritingItem} notebook={activeNotebook} notebooks={notebooks} onSelectNotebook={setActiveNotebookId} onCreateNotebook={() => setNotebookModal(true)} onAdd={() => setModal(true)} onDeleteCollectionItem={onDeleteCollectionItem} onDeleteNotebook={onDeleteNotebook} onDeleteSource={onDeleteSource} onSaveNotebookNotes={onSaveNotebookNotes} onAddDocument={onAddDocument} onDeleteDocument={onDeleteDocument} onUpdateNotebookTitle={onUpdateNotebookTitle} providers={providerPreferences} onAddProvider={() => setProviderModal(true)} onRemoveProvider={onRemoveProvider} soul={soul.body} onSaveSoul={onSaveSoul} onClearSoul={onClearSoul} wellbeingCheckins={wellbeingCheckins} wellbeingMedications={wellbeingMedications} wellbeingAppointment={wellbeingAppointment} onSaveWellbeingCheckin={onSaveWellbeingCheckin} onDeleteWellbeingCheckin={onDeleteWellbeingCheckin} onSaveWellbeingMedication={onSaveWellbeingMedication} onDeleteWellbeingMedication={onDeleteWellbeingMedication} onSaveWellbeingAppointment={onSaveWellbeingAppointment} onClearWellbeingAppointment={onClearWellbeingAppointment} /></div>{lanternCollapsed ? <button className="lantern-reopen" type="button" aria-expanded="false" aria-controls="lantern-panel" onClick={() => setLanternPanelCollapsed(false)}><PanelRightOpen size={19} />Open Lantern</button> : <LanternPanel tab={tab} reply={lanternReply} onSuggestion={onSuggestion} onExpand={() => setExpandedChat(true)} onCollapse={() => setLanternPanelCollapsed(true)} />}</div>
      </main></div>{modal && <AddItemModal type={activeTab} onClose={() => setModal(false)} onSave={onAddItem} />}{writingModalKind && <WritingCollectionModal kind={writingModalKind} onClose={() => setWritingModalKind(null)} onSave={(title, description, firstItem) => onCreateWritingCollection(writingModalKind, title, description, firstItem)} />}{notebookModal && <NotebookModal onClose={() => setNotebookModal(false)} onSave={onCreateNotebook} />}{providerModal && <ProviderModal onClose={() => setProviderModal(false)} onSave={onSaveProvider} />}{expandedChat && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true" aria-labelledby="chat-title" style={{ width: "min(760px, 100%)" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><h2 id="chat-title">Chat with The Lantern</h2><p>The Lantern will stay aware of the open {tab.label.toLowerCase()} workspace.</p></div><IconButton label="Close Lantern chat" onClick={() => setExpandedChat(false)}><X size={19} /></IconButton></div><AIChatBox messages={messages} onSendMessage={content => onChat(content, researchMode)} isLoading={lanternBusy} placeholder={`Ask about ${tab.label.toLowerCase()} or anything in Pana’s Lantern…`} height="430px" emptyStateMessage="The Lantern is ready to answer app questions, help with your work, or research a topic." suggestedPrompts={["How do I use this page?", ...tab.suggestions.slice(0, 2)]} />{pendingActions.length > 0 && <div className="assistant-actions"><strong>Ready for your confirmation</strong>{pendingActions.map((action, index) => <div className={`assistant-action ${action.type.startsWith("delete_") ? "danger" : ""}`} key={`${action.type}-${index}`}><div><p>{action.confirmation}</p><details><summary>Review action details</summary><small>Action: {action.type}. {Object.entries(action.payload ?? {}).map(([key, value]) => `${key}: ${value}`).join(" · ") || "No additional details."}</small></details></div><button className="button small accent" type="button" onClick={() => { applyAssistantAction(action); setPendingActions(current => current.filter((_, itemIndex) => itemIndex !== index)); }}>Confirm</button><button className="button small ghost" type="button" onClick={() => setPendingActions(current => current.filter((_, itemIndex) => itemIndex !== index))}>Not now</button></div>)}</div>}<div className="chat-footer-bar"><label className="research-toggle"><input type="checkbox" checked={researchMode} onChange={event => setResearchMode(event.target.checked)} /> Research public web sources</label><div className="chat-footer-actions"><span className="muted tiny">Chat is kept for this tab until cleared.</span><button className="button small ghost" type="button" disabled={messages.length === 0 || lanternBusy} onClick={clearActiveChat}><MessageSquarePlus size={15} />New chat</button><button className="button small ghost danger" type="button" disabled={Object.values(chatSessions).every(session => session.length === 0) || lanternBusy} onClick={clearAllChats}><Trash2 size={15} />Clear all chats</button></div></div></div></div>}</div>;
}
