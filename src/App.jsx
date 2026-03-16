import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA81b8mp36KvDSpCNPvY9LVQZovtl1mqTs",
  authDomain: "treibhaus2027.firebaseapp.com",
  projectId: "treibhaus2027",
  storageBucket: "treibhaus2027.firebasestorage.app",
  messagingSenderId: "158526171568",
  appId: "1:158526171568:web:b09640e49876e961874e75",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

const STATUSES = ["Offen", "In Bearbeitung", "Erledigt"];
const PRIORITIES = ["Niedrig", "Mittel", "Hoch"];

const INIT_CONFIG = {
  platformPassword: "treibhaus2026",
  siteTitle: "Freilichtfestspiele Treibhaus",
  siteSubtitle: "Projektmanagement 2026",
  premiereDate: "2026-07-01",
  adminPassword: "admin123",
  headerImage: "https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=1200&q=80",
  ressorts: [
    { id: "regie", label: "Regie", color: "#6c63ff", budget: 8000, verantwortlich: "" },
    { id: "ton", label: "Ton & Musik", color: "#f59e0b", budget: 5000, verantwortlich: "" },
    { id: "buehne", label: "Bühnenbild", color: "#10b981", budget: 12000, verantwortlich: "" },
    { id: "kostuem", label: "Kostüm & Maske", color: "#ec4899", budget: 4000, verantwortlich: "" },
    { id: "marketing", label: "Marketing", color: "#3b82f6", budget: 3000, verantwortlich: "" },
  ],
};

const INIT_MILESTONES = [
  { id: "1", ressort: "regie", title: "Konzept fertiggestellt", dueDate: "2026-03-20", status: "Erledigt", priority: "Hoch", verantwortlich: "", checklist: [{ text: "Drehbuch", done: true }, { text: "Regiebuch", done: true }], files: [], milestoneFiles: [] },
  { id: "2", ressort: "regie", title: "Probenplan erstellt", dueDate: "2026-04-01", status: "In Bearbeitung", priority: "Mittel", verantwortlich: "", checklist: [{ text: "Raumplan", done: true }, { text: "Zeitplan", done: false }], files: [], milestoneFiles: [] },
  { id: "3", ressort: "buehne", title: "Bühnenbild-Entwurf", dueDate: "2026-03-30", status: "Erledigt", priority: "Hoch", verantwortlich: "", checklist: [], files: [], milestoneFiles: [] },
  { id: "4", ressort: "marketing", title: "Plakat gestaltet", dueDate: "2026-04-01", status: "Erledigt", priority: "Hoch", verantwortlich: "", checklist: [], files: [], milestoneFiles: [] },
  { id: "5", ressort: "ton", title: "Soundkonzept", dueDate: "2026-03-25", status: "Erledigt", priority: "Hoch", verantwortlich: "", checklist: [], files: [], milestoneFiles: [] },
];

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
};

const formatEUR = (n) =>
  new Intl.NumberFormat("de-AT", { style: "currency", currency: "EUR" }).format(n || 0);

const makeEmptyMilestone = (ressort) => ({
  id: null, ressort, title: "", dueDate: "", status: "Offen", priority: "Mittel",
  verantwortlich: "", checklist: [], files: [], milestoneFiles: [],
});

const STATUS_COLOR = { "Offen": "#6b7280", "In Bearbeitung": "#f59e0b", "Erledigt": "#10b981" };
const PRIORITY_COLOR = { "Niedrig": "#10b981", "Mittel": "#f59e0b", "Hoch": "#ef4444" };

// ─── CONFIRM MODAL ────────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px", maxWidth: 360, width: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ margin: "0 0 10px", color: "#1e293b", fontWeight: 800 }}>Wirklich löschen?</h3>
        <p style={{ color: "#6b7280", fontSize: 14, marginBottom: 24 }}>{message || "Dieser Eintrag wird unwiderruflich gelöscht."}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <button style={{ background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }} onClick={onConfirm}>Ja, löschen</button>
          <button style={{ background: "#e2e8f0", color: "#374151", border: "none", borderRadius: 8, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer" }} onClick={onCancel}>Abbrechen</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN GATE ───────────────────────────────────────────────────────────────
function LoginGate({ onUnlock, platformPassword }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const tryLogin = () => {
    if (pw === (platformPassword || "treibhaus2026")) { onUnlock(); }
    else { setError(true); setPw(""); }
  };
  return (
    <div style={{ minHeight: "100vh", background: "#1e1b4b", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: 18, padding: "40px 36px", maxWidth: 380, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)", textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🎭</div>
        <h2 style={{ margin: "0 0 4px", color: "#1e1b4b", fontWeight: 900 }}>Freilichtfestspiele Treibhaus</h2>
        <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 24 }}>Projektmanagement 2026 – Bitte anmelden</p>
        <input
          style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 15, outline: "none", marginBottom: 12, boxSizing: "border-box", textAlign: "center", letterSpacing: 2 }}
          type="password" placeholder="Passwort eingeben..." value={pw}
          onChange={(e) => { setPw(e.target.value); setError(false); }}
          onKeyDown={(e) => e.key === "Enter" && tryLogin()}
        />
        {error && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 10 }}>❌ Falsches Passwort</p>}
        <button
          style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "10px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%" }}
          onClick={tryLogin}>Anmelden →</button>
      </div>
    </div>
  );
}

// ─── BUDGET BAR ───────────────────────────────────────────────────────────────
function BudgetBar({ spent, budget, color }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 8, height: 8, margin: "6px 0" }}>
      <div style={{ width: `${pct}%`, background: pct > 90 ? "#ef4444" : color, height: 8, borderRadius: 8, transition: "width 0.4s" }} />
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ config, milestones, ressortFiles, navigateToRessort, setPage }) {
  const premiere = config.premiereDate ? daysUntil(config.premiereDate) : null;
  const total = milestones.length;
  const done = milestones.filter((m) => m.status === "Erledigt").length;
  const inProgress = milestones.filter((m) => m.status === "In Bearbeitung").length;
  const overdue = milestones.filter((m) => m.dueDate && daysUntil(m.dueDate) < 0 && m.status !== "Erledigt").length;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
      {config.headerImage && (
        <div style={{ borderRadius: 18, overflow: "hidden", marginBottom: 28, maxHeight: 220, position: "relative" }}>
          <img src={config.headerImage} alt="Header" style={{ width: "100%", objectFit: "cover", maxHeight: 220, display: "block" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(30,27,75,0.7) 0%, transparent 60%)", display: "flex", alignItems: "center", padding: "0 36px" }}>
            <div>
              <h1 style={{ color: "#fff", fontWeight: 900, fontSize: 28, margin: 0 }}>{config.siteTitle}</h1>
              <p style={{ color: "rgba(255,255,255,0.8)", margin: "4px 0 0", fontSize: 15 }}>{config.siteSubtitle}</p>
            </div>
          </div>
        </div>
      )}

      {premiere !== null && (
        <div style={{ background: premiere < 0 ? "#fef2f2" : premiere < 30 ? "#fffbeb" : "#f0fdf4", border: `1.5px solid ${premiere < 0 ? "#fca5a5" : premiere < 30 ? "#fcd34d" : "#86efac"}`, borderRadius: 12, padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 24 }}>{premiere < 0 ? "🎭" : premiere < 30 ? "⚡" : "📅"}</span>
          <div>
            <strong style={{ color: "#1e293b" }}>
              {premiere < 0 ? `Premiere war vor ${Math.abs(premiere)} Tagen` : premiere === 0 ? "Premiere ist HEUTE! 🎉" : `${premiere} Tage bis zur Premiere`}
            </strong>
            <div style={{ fontSize: 12, color: "#6b7280" }}>{config.premiereDate}</div>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 16, marginBottom: 32 }}>
        {[
          { label: "Gesamt", value: total, color: "#6c63ff", icon: "📋" },
          { label: "Erledigt", value: done, color: "#10b981", icon: "✅" },
          { label: "In Bearbeitung", value: inProgress, color: "#f59e0b", icon: "🔄" },
          { label: "Überfällig", value: overdue, color: "#ef4444", icon: "⚠️" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", textAlign: "center", borderTop: `4px solid ${s.color}` }}>
            <div style={{ fontSize: 28 }}>{s.icon}</div>
            <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontWeight: 800, color: "#1e293b", marginBottom: 16 }}>Ressorts</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        {config.ressorts.map((r) => {
          const rMs = milestones.filter((m) => m.ressort === r.id);
          const rDone = rMs.filter((m) => m.status === "Erledigt").length;
          const rFiles = ressortFiles[r.id] || [];
          const spent = rMs.reduce((s, m) => s + (m.budget || 0), 0);
          return (
            <div key={r.id} onClick={() => navigateToRessort(r.id)}
              style={{ background: "#fff", borderRadius: 14, padding: "20px 18px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)", cursor: "pointer", borderLeft: `5px solid ${r.color}`, transition: "box-shadow 0.2s", position: "relative" }}
              onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.13)"}
              onMouseLeave={(e) => e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)"}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <h3 style={{ margin: 0, color: r.color, fontWeight: 800, fontSize: 17 }}>{r.label}</h3>
                <span style={{ background: r.color + "22", color: r.color, borderRadius: 20, padding: "2px 10px", fontSize: 12, fontWeight: 700 }}>{rDone}/{rMs.length}</span>
              </div>
              {r.verantwortlich && <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 6 }}>👤 {r.verantwortlich}</div>}
              <div style={{ background: "#f1f5f9", borderRadius: 8, height: 8, marginBottom: 8 }}>
                <div style={{ width: rMs.length > 0 ? `${(rDone / rMs.length) * 100}%` : "0%", background: r.color, height: 8, borderRadius: 8, transition: "width 0.4s" }} />
              </div>
              {r.budget > 0 && (
                <>
                  <BudgetBar spent={spent} budget={r.budget} color={r.color} />
                  <div style={{ fontSize: 11, color: "#9ca3af" }}>{formatEUR(spent)} / {formatEUR(r.budget)}</div>
                </>
              )}
              {rFiles.length > 0 && <div style={{ fontSize: 11, color: "#6b7280", marginTop: 6 }}>📎 {rFiles.length} Datei(en)</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── RESSORT PAGE ─────────────────────────────────────────────────────────────
function RessortPage({
  config, milestones, activeRessort, setPage,
  expandedId, setExpandedId,
  editingMilestone, setEditingMilestone,
  addingMilestone, setAddingMilestone,
  newMilestone, setNewMilestone,
  newCheckText, setNewCheckText,
  editCheckText, setEditCheckText,
  filterStatus, setFilterStatus,
  filterPriority, setFilterPriority,
  searchText, setSearchText,
  ressortTab, setRessortTab,
  saveMilestone, deleteMilestone, addMilestone,
  ressortFiles, onRessortFileUpload, onRessortFileDelete,
}) {
  const ressort = config.ressorts.find((r) => r.id === activeRessort);
  if (!ressort) return <div style={{ padding: 40, textAlign: "center", color: "#6b7280" }}>Ressort nicht gefunden.</div>;

  let filtered = milestones.filter((m) => m.ressort === activeRessort);
  if (filterStatus) filtered = filtered.filter((m) => m.status === filterStatus);
  if (filterPriority) filtered = filtered.filter((m) => m.priority === filterPriority);
  if (searchText) filtered = filtered.filter((m) => m.title.toLowerCase().includes(searchText.toLowerCase()));

  const rFiles = ressortFiles[activeRessort] || [];

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
      <button onClick={() => setPage("dashboard")} style={{ background: "none", border: "none", color: "#6c63ff", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 16 }}>← Zurück zur Übersicht</button>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 8 }}>
        <div style={{ width: 14, height: 14, borderRadius: "50%", background: ressort.color }} />
        <h2 style={{ margin: 0, fontWeight: 900, color: "#1e293b", fontSize: 24 }}>{ressort.label}</h2>
      </div>
      {ressort.verantwortlich && <div style={{ color: "#6b7280", fontSize: 13, marginBottom: 16 }}>👤 {ressort.verantwortlich}</div>}

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e2e8f0" }}>
        {["Meilensteine", "Dateien"].map((tab) => (
          <button key={tab} onClick={() => setRessortTab(tab)}
            style={{ background: "none", border: "none", borderBottom: ressortTab === tab ? `3px solid ${ressort.color}` : "3px solid transparent", color: ressortTab === tab ? ressort.color : "#6b7280", fontWeight: 700, fontSize: 14, padding: "8px 20px", cursor: "pointer", marginBottom: -2 }}>
            {tab}
          </button>
        ))}
      </div>

      {ressortTab === "Dateien" ? (
        <div>
          <label style={{ display: "inline-block", background: ressort.color, color: "#fff", borderRadius: 8, padding: "8px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginBottom: 16 }}>
            + Datei hochladen
            <input type="file" multiple style={{ display: "none" }} onChange={(e) => onRessortFileUpload(activeRessort, e.target.files)} />
          </label>
          {rFiles.length === 0 ? (
            <p style={{ color: "#9ca3af", fontSize: 14 }}>Noch keine Dateien hochgeladen.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {rFiles.map((f, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 10, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 6px rgba(0,0,0,0.07)" }}>
                  <div>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ color: ressort.color, fontWeight: 700, textDecoration: "none", fontSize: 14 }}>📎 {f.name}</a>
                    <div style={{ fontSize: 11, color: "#9ca3af" }}>{f.size ? `${(f.size / 1024).toFixed(1)} KB` : ""}</div>
                  </div>
                  <button onClick={() => onRessortFileDelete(activeRessort, i)} style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontWeight: 700, fontSize: 12 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="🔍 Suchen..." style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 13, outline: "none", minWidth: 160 }} />
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }}>
              <option value="">Alle Status</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <select value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)} style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 10px", fontSize: 13, outline: "none" }}>
              <option value="">Alle Prioritäten</option>
              {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
            </select>
            <button onClick={() => { setAddingMilestone(true); setNewMilestone(makeEmptyMilestone(activeRessort)); }}
              style={{ background: ressort.color, color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer", marginLeft: "auto" }}>
              + Meilenstein
            </button>
          </div>

          {addingMilestone && (
            <MilestoneForm
              milestone={newMilestone} setMilestone={setNewMilestone}
              newCheckText={newCheckText} setNewCheckText={setNewCheckText}
              onSave={() => addMilestone()} onCancel={() => setAddingMilestone(false)}
              color={ressort.color} title="Neuer Meilenstein"
            />
          )}

          {filtered.length === 0 && !addingMilestone && (
            <div style={{ textAlign: "center", color: "#9ca3af", padding: "40px 0", fontSize: 15 }}>Keine Meilensteine gefunden.</div>
          )}

          {filtered.map((m) => {
            const days = daysUntil(m.dueDate);
            const isExpanded = expandedId === m.id;
            const isEditing = editingMilestone?.id === m.id;
            const checkDone = m.checklist.filter((c) => c.done).length;

            return (
              <div key={m.id} style={{ background: "#fff", borderRadius: 14, marginBottom: 14, boxShadow: "0 2px 12px rgba(0,0,0,0.07)", borderLeft: `5px solid ${ressort.color}`, overflow: "hidden" }}>
                <div onClick={() => setExpandedId(isExpanded ? null : m.id)}
                  style={{ padding: "16px 18px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#1e293b", fontSize: 15, marginBottom: 4 }}>{m.title}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ background: STATUS_COLOR[m.status] + "22", color: STATUS_COLOR[m.status], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{m.status}</span>
                      <span style={{ background: PRIORITY_COLOR[m.priority] + "22", color: PRIORITY_COLOR[m.priority], borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>{m.priority}</span>
                      {m.dueDate && (
                        <span style={{ fontSize: 11, color: days < 0 ? "#ef4444" : days < 7 ? "#f59e0b" : "#6b7280" }}>
                          📅 {m.dueDate} {days < 0 ? `(${Math.abs(days)}d überfällig)` : days === 0 ? "(heute)" : `(in ${days}d)`}
                        </span>
                      )}
                      {m.checklist.length > 0 && <span style={{ fontSize: 11, color: "#6b7280" }}>☑ {checkDone}/{m.checklist.length}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: "#9ca3af", marginLeft: 10 }}>{isExpanded ? "▲" : "▼"}</span>
                </div>

                {isExpanded && !isEditing && (
                  <div style={{ padding: "0 18px 18px", borderTop: "1px solid #f1f5f9" }}>
                    {m.verantwortlich && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 10 }}>👤 {m.verantwortlich}</div>}
                    {m.checklist.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#374151", marginBottom: 6 }}>Checkliste</div>
                        {m.checklist.map((c, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                            <input type="checkbox" checked={c.done} readOnly style={{ cursor: "default" }} />
                            <span style={{ fontSize: 13, color: c.done ? "#10b981" : "#374151", textDecoration: c.done ? "line-through" : "none" }}>{c.text}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                      <button onClick={() => setEditingMilestone({ ...m })} style={{ background: ressort.color, color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>✏️ Bearbeiten</button>
                      <button onClick={() => deleteMilestone(m.id)} style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, padding: "7px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>🗑️ Löschen</button>
                    </div>
                  </div>
                )}

                {isEditing && (
                  <div style={{ padding: "0 18px 18px", borderTop: "1px solid #f1f5f9" }}>
                    <MilestoneForm
                      milestone={editingMilestone} setMilestone={setEditingMilestone}
                      newCheckText={editCheckText} setNewCheckText={setEditCheckText}
                      onSave={() => saveMilestone(editingMilestone)} onCancel={() => setEditingMilestone(null)}
                      color={ressort.color} title="Meilenstein bearbeiten"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

// ─── MILESTONE FORM ───────────────────────────────────────────────────────────
function MilestoneForm({ milestone, setMilestone, newCheckText, setNewCheckText, onSave, onCancel, color, title }) {
  const update = (key, val) => setMilestone((prev) => ({ ...prev, [key]: val }));
  const addCheck = () => {
    if (!newCheckText.trim()) return;
    update("checklist", [...(milestone.checklist || []), { text: newCheckText.trim(), done: false }]);
    setNewCheckText("");
  };
  const removeCheck = (i) => update("checklist", milestone.checklist.filter((_, idx) => idx !== i));
  const toggleCheck = (i) => update("checklist", milestone.checklist.map((c, idx) => idx === i ? { ...c, done: !c.done } : c));

  return (
    <div style={{ background: "#f8fafc", borderRadius: 12, padding: "18px 16px", marginTop: 12 }}>
      <div style={{ fontWeight: 800, color: "#1e293b", marginBottom: 14, fontSize: 15 }}>{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Titel *</label>
          <input value={milestone.title} onChange={(e) => update("title", e.target.value)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 3 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Fälligkeitsdatum</label>
          <input type="date" value={milestone.dueDate} onChange={(e) => update("dueDate", e.target.value)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 3 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Status</label>
          <select value={milestone.status} onChange={(e) => update("status", e.target.value)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 3 }}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Priorität</label>
          <select value={milestone.priority} onChange={(e) => update("priority", e.target.value)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 3 }}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Verantwortlich</label>
          <input value={milestone.verantwortlich || ""} onChange={(e) => update("verantwortlich", e.target.value)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 3 }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Budget (€)</label>
          <input type="number" value={milestone.budget || ""} onChange={(e) => update("budget", parseFloat(e.target.value) || 0)}
            style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 3 }} />
        </div>
      </div>

      <div style={{ marginBottom: 10 }}>
        <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>Checkliste</label>
        {(milestone.checklist || []).map((c, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            <input type="checkbox" checked={c.done} onChange={() => toggleCheck(i)} />
            <span style={{ flex: 1, fontSize: 13, color: c.done ? "#10b981" : "#374151", textDecoration: c.done ? "line-through" : "none" }}>{c.text}</span>
            <button onClick={() => removeCheck(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
          <input value={newCheckText} onChange={(e) => setNewCheckText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCheck()}
            placeholder="Neuer Punkt..." style={{ flex: 1, border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 13, outline: "none" }} />
          <button onClick={addCheck} style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onSave} style={{ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "9px 24px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>💾 Speichern</button>
        <button onClick={onCancel} style={{ background: "#e2e8f0", color: "#374151", border: "none", borderRadius: 8, padding: "9px 18px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>Abbrechen</button>
      </div>
    </div>
  );
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage({
  adminUnlocked, adminPwInput, setAdminPwInput, adminPwError, tryAdminLogin,
  editConfig, setEditConfig, saveAdminConfig,
  newRessortLabel, setNewRessortLabel, newRessortColor, setNewRessortColor, addNewRessort,
  milestones, config, ressortFiles, navigateToRessort,
  setEditingMilestone, deleteMilestone, setAdminUnlocked, setAdminPwError, dbStatus,
}) {
  if (!adminUnlocked) {
    return (
      <div style={{ maxWidth: 400, margin: "80px auto", padding: "0 16px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: "36px 28px", boxShadow: "0 4px 20px rgba(0,0,0,0.1)", textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🔐</div>
          <h2 style={{ margin: "0 0 16px", color: "#1e293b", fontWeight: 800 }}>Admin-Bereich</h2>
          <input type="password" value={adminPwInput} onChange={(e) => { setAdminPwInput(e.target.value); setAdminPwError(false); }}
            onKeyDown={(e) => e.key === "Enter" && tryAdminLogin()}
            placeholder="Admin-Passwort..." style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "10px 14px", fontSize: 15, outline: "none", boxSizing: "border-box", textAlign: "center", marginBottom: 10 }} />
          {adminPwError && <p style={{ color: "#ef4444", fontSize: 13, marginBottom: 8 }}>❌ Falsches Passwort</p>}
          <button onClick={tryAdminLogin} style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "10px 32px", fontWeight: 700, fontSize: 15, cursor: "pointer", width: "100%" }}>Anmelden</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <h2 style={{ fontWeight: 900, color: "#1e293b", margin: 0 }}>⚙️ Admin-Bereich</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: dbStatus === "ok" ? "#10b981" : dbStatus === "error" ? "#ef4444" : "#f59e0b", fontWeight: 700 }}>
            {dbStatus === "ok" ? "🟢 Firebase OK" : dbStatus === "error" ? "🔴 Firebase Fehler" : "🟡 Verbinde..."}
          </span>
          <button onClick={() => setAdminUnlocked(false)} style={{ background: "#e2e8f0", color: "#374151", border: "none", borderRadius: 8, padding: "7px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>Abmelden</button>
        </div>
      </div>

      {/* General Settings */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <h3 style={{ fontWeight: 800, color: "#1e293b", margin: "0 0 16px" }}>Allgemeine Einstellungen</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { key: "siteTitle", label: "Seitentitel" },
            { key: "siteSubtitle", label: "Untertitel" },
            { key: "adminPassword", label: "Admin-Passwort" },
            { key: "platformPassword", label: "🔐 App-Passwort (Login beim Öffnen)" },
            { key: "premiereDate", label: "Premiere-Datum", type: "date" },
            { key: "headerImage", label: "Header-Bild URL" },
          ].map(({ key, label, type }) => (
            <div key={key} style={{ gridColumn: key === "headerImage" ? "1/-1" : undefined }}>
              <label style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>{label}</label>
              <input type={type || "text"} value={editConfig[key] || ""}
                onChange={(e) => setEditConfig((prev) => ({ ...prev, [key]: e.target.value }))}
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", boxSizing: "border-box", marginTop: 3 }} />
            </div>
          ))}
        </div>
        <button onClick={saveAdminConfig} style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 16 }}>💾 Einstellungen speichern</button>
      </div>

      {/* Ressorts */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", marginBottom: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <h3 style={{ fontWeight: 800, color: "#1e293b", margin: "0 0 16px" }}>Ressorts verwalten</h3>
        {editConfig.ressorts?.map((r, i) => (
          <div key={r.id} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 10, flexWrap: "wrap" }}>
            <input type="color" value={r.color} onChange={(e) => {
              const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], color: e.target.value };
              setEditConfig((p) => ({ ...p, ressorts: rs }));
            }} style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer" }} />
            <input value={r.label} onChange={(e) => {
              const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], label: e.target.value };
              setEditConfig((p) => ({ ...p, ressorts: rs }));
            }} style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 14, outline: "none", minWidth: 140 }} />
            <input value={r.verantwortlich || ""} placeholder="Verantwortlich" onChange={(e) => {
              const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], verantwortlich: e.target.value };
              setEditConfig((p) => ({ ...p, ressorts: rs }));
            }} style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 14, outline: "none", minWidth: 140 }} />
            <input type="number" value={r.budget || ""} placeholder="Budget €" onChange={(e) => {
              const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], budget: parseFloat(e.target.value) || 0 };
              setEditConfig((p) => ({ ...p, ressorts: rs }));
            }} style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 14, outline: "none", width: 100 }} />
            <button onClick={() => {
              setEditConfig((p) => ({ ...p, ressorts: p.ressorts.filter((_, idx) => idx !== i) }));
            }} style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, cursor: "pointer" }}>✕</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <input value={newRessortLabel} onChange={(e) => setNewRessortLabel(e.target.value)} placeholder="Neues Ressort..." style={{ border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "7px 12px", fontSize: 14, outline: "none" }} />
          <input type="color" value={newRessortColor} onChange={(e) => setNewRessortColor(e.target.value)} style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer" }} />
          <button onClick={addNewRessort} style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "7px 18px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Hinzufügen</button>
        </div>
        <button onClick={saveAdminConfig} style={{ background: "#6c63ff", color: "#fff", border: "none", borderRadius: 8, padding: "10px 28px", fontWeight: 700, fontSize: 14, cursor: "pointer", marginTop: 16 }}>💾 Ressorts speichern</button>
      </div>

      {/* All Milestones */}
      <div style={{ background: "#fff", borderRadius: 14, padding: "22px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}>
        <h3 style={{ fontWeight: 800, color: "#1e293b", margin: "0 0 16px" }}>Alle Meilensteine</h3>
        {milestones.length === 0 && <p style={{ color: "#9ca3af" }}>Keine Meilensteine vorhanden.</p>}
        {milestones.map((m) => {
          const r = config.ressorts.find((r) => r.id === m.ressort);
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap", gap: 8 }}>
              <div>
                <span style={{ fontWeight: 700, color: "#1e293b", fontSize: 14 }}>{m.title}</span>
                <span style={{ marginLeft: 8, fontSize: 12, color: r?.color || "#6b7280", background: (r?.color || "#6b7280") + "22", borderRadius: 20, padding: "2px 8px", fontWeight: 700 }}>{r?.label || m.ressort}</span>
                <span style={{ marginLeft: 6, fontSize: 12, color: STATUS_COLOR[m.status] }}>{m.status}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => { navigateToRessort(m.ressort); setTimeout(() => setEditingMilestone({ ...m }), 100); }}
                  style={{ background: "#ede9fe", color: "#6c63ff", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>✏️</button>
                <button onClick={() => deleteMilestone(m.id)}
                  style={{ background: "#fee2e2", color: "#ef4444", border: "none", borderRadius: 8, padding: "5px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>🗑️</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [config, setConfig] = useState(INIT_CONFIG);
  const [milestones, setMilestones] = useState(INIT_MILESTONES);
  const [ressortFiles, setRessortFiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState("dashboard");
  const [activeRessort, setActiveRessort] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState(makeEmptyMilestone(""));
  const [newCheckText, setNewCheckText] = useState("");
  const [editCheckText, setEditCheckText] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [searchText, setSearchText] = useState("");
  const [ressortTab, setRessortTab] = useState("Meilensteine");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [adminPwError, setAdminPwError] = useState(false);
  const [editConfig, setEditConfig] = useState(INIT_CONFIG);
  const [newRessortLabel, setNewRessortLabel] = useState("");
  const [newRessortColor, setNewRessortColor] = useState("#6c63ff");
  const [platformUnlocked, setPlatformUnlocked] = useState(false);
  const [dbStatus, setDbStatus] = useState("connecting");
  const [confirmModal, setConfirmModal] = useState(null);

  const askConfirm = (message, onConfirm) => setConfirmModal({ message, onConfirm });

  // Load from Firebase
  useEffect(() => {
    const load = async () => {
      try {
        const cfgSnap = await getDoc(doc(db, "config", "main"));
        if (cfgSnap.exists()) {
          const data = cfgSnap.data();
          setConfig(data);
          setEditConfig(data);
        }
        const msSnap = await getDocs(collection(db, "milestones"));
        if (!msSnap.empty) {
          setMilestones(msSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
        setDbStatus("ok");
      } catch (e) {
        console.error("Firebase load error:", e);
        setDbStatus("error");
      }
      setLoading(false);
    };
    load();
  }, []);

  const saveMilestone = async (m) => {
    setMilestones((prev) => prev.map((x) => x.id === m.id ? m : x));
    setEditingMilestone(null);
    try {
      await setDoc(doc(db, "milestones", String(m.id)), m);
    } catch (e) { console.error("Save milestone error:", e); }
  };

  const deleteMilestone = (id) => {
    askConfirm("Der Meilenstein wird unwiderruflich gelöscht.", async () => {
      setConfirmModal(null);
      setMilestones((prev) => prev.filter((m) => m.id !== id));
      setEditingMilestone(null);
      try {
        await deleteDoc(doc(db, "milestones", String(id)));
      } catch (e) { console.error("Delete milestone error:", e); }
    });
  };

  const addMilestone = async () => {
    if (!newMilestone.title.trim()) return;
    const id = String(Date.now());
    const m = { ...newMilestone, id };
    setMilestones((prev) => [...prev, m]);
    setAddingMilestone(false);
    setNewMilestone(makeEmptyMilestone(activeRessort));
    setNewCheckText("");
    try {
      await setDoc(doc(db, "milestones", id), m);
    } catch (e) { console.error("Add milestone error:", e); }
  };

  const saveAdminConfig = async () => {
    setConfig(editConfig);
    try {
      await setDoc(doc(db, "config", "main"), editConfig);
      alert("✅ Einstellungen gespeichert!");
    } catch (e) { console.error("Save config error:", e); alert("❌ Fehler beim Speichern."); }
  };

  const addNewRessort = () => {
    if (!newRessortLabel.trim()) return;
    const id = newRessortLabel.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const newR = { id, label: newRessortLabel.trim(), color: newRessortColor, budget: 0, verantwortlich: "" };
    setEditConfig((prev) => ({ ...prev, ressorts: [...(prev.ressorts || []), newR] }));
    setNewRessortLabel("");
    setNewRessortColor("#6c63ff");
  };

  const tryAdminLogin = () => {
    if (adminPwInput === (config.adminPassword || "admin123")) {
      setAdminUnlocked(true); setAdminPwInput(""); setAdminPwError(false);
    } else { setAdminPwError(true); setAdminPwInput(""); }
  };

  const navigateToRessort = (id) => {
    setActiveRessort(id); setPage("ressort");
    setExpandedId(null); setEditingMilestone(null);
    setAddingMilestone(false); setFilterStatus("");
    setFilterPriority(""); setSearchText(""); setRessortTab("Meilensteine");
  };

  const onRessortFileUpload = (ressortId, files) => {
    const arr = Array.from(files).map((f) => ({
      name: f.name, size: f.size,
      url: URL.createObjectURL(f),
    }));
    setRessortFiles((prev) => ({ ...prev, [ressortId]: [...(prev[ressortId] || []), ...arr] }));
  };

  const onRessortFileDelete = (ressortId, idx) => {
    setRessortFiles((prev) => ({ ...prev, [ressortId]: (prev[ressortId] || []).filter((_, i) => i !== idx) }));
  };

  if (!platformUnlocked) {
    return <LoginGate onUnlock={() => setPlatformUnlocked(true)} platformPassword={config.platformPassword} />;
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🎭</div>
          <div style={{ color: "#6b7280", fontSize: 16 }}>Lade Daten...</div>
        </div>
      </div>
    );
  }

  const S = {
    app: { minHeight: "100vh", background: "#f8fafc", fontFamily: "Inter, system-ui, sans-serif" },
    nav: { background: "#1e1b4b", padding: "0 24px", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 2px 12px rgba(0,0,0,0.15)", position: "sticky", top: 0, zIndex: 100 },
    navBtn: (active) => ({ background: active ? "rgba(255,255,255,0.15)" : "none", color: "#fff", border: "none", borderRadius: 8, padding: "10px 16px", fontWeight: active ? 700 : 500, fontSize: 14, cursor: "pointer", transition: "background 0.2s" }),
  };

  return (
    <div style={S.app}>
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      <nav style={S.nav}>
        <span style={{ color: "#fff", fontWeight: 900, fontSize: 16, marginRight: 8 }}>🎭</span>
        <button style={S.navBtn(page === "dashboard")} onClick={() => setPage("dashboard")}>Dashboard</button>
        {config.ressorts?.map((r) => (
          <button key={r.id} style={{ ...S.navBtn(page === "ressort" && activeRessort === r.id), borderBottom: page === "ressort" && activeRessort === r.id ? `3px solid ${r.color}` : "3px solid transparent" }}
            onClick={() => navigateToRessort(r.id)}>{r.label}</button>
        ))}
        <button style={{ ...S.navBtn(page === "admin"), marginLeft: "auto" }} onClick={() => setPage("admin")}>⚙️ Admin</button>
      </nav>

      {page === "dashboard" && (
        <Dashboard config={config} milestones={milestones} ressortFiles={ressortFiles} navigateToRessort={navigateToRessort} setPage={setPage} />
      )}
      {page === "ressort" && (
        <RessortPage
          config={config} milestones={milestones} ressortFiles={ressortFiles}
          activeRessort={activeRessort} setPage={setPage}
          expandedId={expandedId} setExpandedId={setExpandedId}
          editingMilestone={editingMilestone} setEditingMilestone={setEditingMilestone}
          addingMilestone={addingMilestone} setAddingMilestone={setAddingMilestone}
          newMilestone={newMilestone} setNewMilestone={setNewMilestone}
          newCheckText={newCheckText} setNewCheckText={setNewCheckText}
          editCheckText={editCheckText} setEditCheckText={setEditCheckText}
          filterStatus={filterStatus} setFilterStatus={setFilterStatus}
          filterPriority={filterPriority} setFilterPriority={setFilterPriority}
          searchText={searchText} setSearchText={setSearchText}
          ressortTab={ressortTab} setRessortTab={setRessortTab}
          saveMilestone={saveMilestone} deleteMilestone={deleteMilestone} addMilestone={addMilestone}
          onRessortFileUpload={onRessortFileUpload} onRessortFileDelete={onRessortFileDelete}
        />
      )}
      {page === "admin" && (
        <AdminPage
          adminUnlocked={adminUnlocked} adminPwInput={adminPwInput} setAdminPwInput={setAdminPwInput}
          adminPwError={adminPwError} tryAdminLogin={tryAdminLogin}
          editConfig={editConfig} setEditConfig={setEditConfig} saveAdminConfig={saveAdminConfig}
          newRessortLabel={newRessortLabel} setNewRessortLabel={setNewRessortLabel}
          newRessortColor={newRessortColor} setNewRessortColor={setNewRessortColor}
          addNewRessort={addNewRessort}
          milestones={milestones} config={config} ressortFiles={ressortFiles}
          navigateToRessort={navigateToRessort}
          setEditingMilestone={setEditingMilestone} deleteMilestone={deleteMilestone}
          setAdminUn
          setAdminUnlocked={setAdminUnlocked} setAdminPwError={setAdminPwError}
          dbStatus={dbStatus}
        />
      )}
    </div>
  );
}
