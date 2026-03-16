import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  addDoc,
  updateDoc,
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

const PLATFORM_PASSWORD = "treibhaus2026";

const STATUSES = ["Offen", "In Bearbeitung", "Erledigt"];
const PRIORITIES = ["Niedrig", "Mittel", "Hoch"];

const INIT_CONFIG = {
  siteTitle: "Freilichtfestspiele Treibhaus",
  siteSubtitle: "Projektmanagement 2026",
  premiereDate: "2026-07-01",
  adminPassword: "admin123",
  headerImage: "https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=1200&q=80",
  ressorts: [
    { id: "regie", label: "Regie", color: "#6c63ff", budget: 8000, verantwortlich: "" },
    { id: "ton", label: "Ton & Musik", color: "#f59e0b", budget: 5000, verantwortlich: "" },
    { id: "buehne", label: "Bühnenbild", color: "#10b981", budget: 12000, verantwortlich: "" },
    { id: "kostüm", label: "Kostüm & Maske", color: "#ec4899", budget: 4000, verantwortlich: "" },
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

const S = {
  app: { fontFamily: "'Segoe UI',sans-serif", minHeight: "100vh", background: "#f1f5f9", color: "#1e293b" },
  nav: { background: "#1e1b4b", padding: "10px 20px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", position: "sticky", top: 0, zIndex: 100 },
  navTitle: { color: "#a5b4fc", fontWeight: 900, fontSize: 16, marginRight: 12 },
  navBtn: (active) => ({ background: active ? "#6c63ff" : "transparent", color: active ? "#fff" : "#c7d2fe", border: "none", borderRadius: 8, padding: "6px 14px", cursor: "pointer", fontWeight: 600, fontSize: 13 }),
  section: { padding: "24px 20px", maxWidth: 960, margin: "0 auto" },
  card: { background: "#fff", borderRadius: 14, padding: "18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: 16 },
  label: { fontSize: 12, color: "#6b7280", fontWeight: 600, marginBottom: 4, display: "block" },
  input: { width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 8, padding: "8px 12px", fontSize: 14, outline: "none", background: "#f8fafc", marginBottom: 10, boxSizing: "border-box" },
  btn: (color) => ({ background: color, color: "#fff", border: "none", borderRadius: 8, padding: "8px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13 }),
  badge: (color) => ({ background: color + "22", color: color, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }),
};

const PRIORITY_COLOR = { Niedrig: "#10b981", Mittel: "#f59e0b", Hoch: "#ef4444" };
const STATUS_COLOR = { Offen: "#6b7280", "In Bearbeitung": "#3b82f6", Erledigt: "#10b981" };

function LoginGate({ onUnlock }) {
  const [pw, setPw] = useState("");
  const [error, setError] = useState(false);
  const tryLogin = () => {
    if (pw === PLATFORM_PASSWORD) { onUnlock(); }
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

function BudgetBar({ budget, used }) {
  const pct = budget > 0 ? Math.min((used / budget) * 100, 100) : 0;
  const over = used > budget;
  return (
    <div style={{ background: "#e2e8f0", borderRadius: 99, height: 6, overflow: "hidden", marginTop: 6 }}>
      <div style={{ width: pct + "%", background: over ? "#ef4444" : "#f59e0b", height: "100%", borderRadius: 99, transition: "width 0.4s" }} />
    </div>
  );
}

function HeaderImageUpload({ currentImage, onChange }) {
  const inputRef = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Bitte nur Bilddateien hochladen."); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
      <button style={{ ...S.btn("#6c63ff"), padding: "7px 16px" }} onClick={() => inputRef.current.click()}>📁 Bild hochladen</button>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFile} />
      {currentImage && currentImage.startsWith("data:") && (
        <button style={{ ...S.btn("#ef4444"), padding: "7px 12px" }} onClick={() => onChange("https://images.unsplash.com/photo-1507924538820-ede94a04019d?w=1200&q=80")}>✕ Zurücksetzen</button>
      )}
    </div>
  );
}

function FileUpload({ files, onChange, label }) {
  const inputRef = useRef();
  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        onChange([...files, { name: file.name, dataUrl: ev.target.result, type: file.type, amount: "", purpose: "", date: new Date().toLocaleDateString("de-AT") }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };
  const removeFile = (i) => onChange(files.filter((_, idx) => idx !== i));
  const updateField = (i, field, value) => onChange(files.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <span style={S.label}>{label}</span>
        <button style={{ ...S.btn("#6c63ff"), padding: "4px 12px", fontSize: 12 }} onClick={() => inputRef.current.click()}>+ Datei hochladen</button>
        <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={handleFiles} />
      </div>
      {files.length === 0 && <div style={{ color: "#9ca3af", fontSize: 13 }}>Keine Belege hochgeladen.</div>}
      {files.map((f, i) => (
        <div key={i} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 13, flex: 1, fontWeight: 600, color: "#374151" }}>📎 {f.name}</span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>{f.date}</span>
            <a href={f.dataUrl} download={f.name} style={{ fontSize: 14, textDecoration: "none" }} title="Herunterladen">⬇️</a>
            <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, padding: 0 }}>✕</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "0 0 150px" }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 2 }}>Betrag (€)</label>
              <input style={{ ...S.input, marginBottom: 0, fontSize: 13, padding: "5px 8px" }} type="number" min="0" step="0.01" placeholder="0.00" value={f.amount} onChange={(e) => updateField(i, "amount", e.target.value)} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <label style={{ fontSize: 11, color: "#6b7280", display: "block", marginBottom: 2 }}>Verwendungszweck</label>
              <input style={{ ...S.input, marginBottom: 0, fontSize: 13, padding: "5px 8px" }} placeholder="z.B. Bühnenbau Material" value={f.purpose || ""} onChange={(e) => updateField(i, "purpose", e.target.value)} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MilestoneFileUpload({ files, onChange }) {
  const inputRef = useRef();
  const handleFiles = (e) => {
    const selected = Array.from(e.target.files);
    selected.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => onChange([...files, { name: file.name, dataUrl: ev.target.result, type: file.type, date: new Date().toLocaleDateString("de-AT") }]);
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };
  const removeFile = (i) => onChange(files.filter((_, idx) => idx !== i));
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <button style={{ ...S.btn("#6c63ff"), padding: "4px 12px", fontSize: 12 }} onClick={() => inputRef.current.click()}>+ Datei hochladen</button>
        <input ref={inputRef} type="file" multiple style={{ display: "none" }} onChange={handleFiles} />
      </div>
      {files.length === 0 && <div style={{ color: "#9ca3af", fontSize: 13 }}>Keine Anhänge.</div>}
      {files.map((f, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", marginBottom: 6 }}>
          <span style={{ fontSize: 13, flex: 1, color: "#374151" }}>📎 {f.name}</span>
          <span style={{ fontSize: 11, color: "#9ca3af" }}>{f.date}</span>
          <a href={f.dataUrl} download={f.name} style={{ fontSize: 14, textDecoration: "none" }} title="Herunterladen">⬇️</a>
          <button onClick={() => removeFile(i)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, padding: 0 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function MilestoneForm({ data, setData, onSave, onCancel, onDelete, checkText, setCheckText, ressorts }) {
  const addCheck = () => {
    if (!checkText.trim()) return;
    setData({ ...data, checklist: [...data.checklist, { text: checkText.trim(), done: false }] });
    setCheckText("");
  };
  const toggleCheck = (i) => setData({ ...data, checklist: data.checklist.map((c, idx) => idx === i ? { ...c, done: !c.done } : c) });
  const removeCheck = (i) => setData({ ...data, checklist: data.checklist.filter((_, idx) => idx !== i) });
  return (
    <div style={{ ...S.card, border: "2px solid #6c63ff", marginBottom: 16 }}>
      <h3 style={{ margin: "0 0 14px", color: "#6c63ff" }}>{data.id ? "Meilenstein bearbeiten" : "Neuer Meilenstein"}</h3>
      <label style={S.label}>Titel *</label>
      <input style={S.input} value={data.title} onChange={(e) => setData({ ...data, title: e.target.value })} placeholder="Meilenstein-Titel" />
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}><label style={S.label}>Fälligkeitsdatum</label><input style={S.input} type="date" value={data.dueDate} onChange={(e) => setData({ ...data, dueDate: e.target.value })} /></div>
        <div style={{ flex: 1 }}><label style={S.label}>Status</label><select style={S.input} value={data.status} onChange={(e) => setData({ ...data, status: e.target.value })}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div style={{ flex: 1 }}><label style={S.label}>Priorität</label><select style={S.input} value={data.priority} onChange={(e) => setData({ ...data, priority: e.target.value })}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</select></div>
        <div style={{ flex: 1 }}><label style={S.label}>Ressort</label><select style={S.input} value={data.ressort} onChange={(e) => setData({ ...data, ressort: e.target.value })}>{ressorts.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}</select></div>
      </div>
      <label style={S.label}>Verantwortlich</label>
      <input style={S.input} value={data.verantwortlich || ""} onChange={(e) => setData({ ...data, verantwortlich: e.target.value })} placeholder="Name der verantwortlichen Person" />
      <label style={S.label}>Checkliste</label>
      {data.checklist.map((c, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <input type="checkbox" checked={c.done} onChange={() => toggleCheck(i)} />
          <span style={{ flex: 1, fontSize: 13, textDecoration: c.done ? "line-through" : "none", color: c.done ? "#9ca3af" : "#374151" }}>{c.text}</span>
          <button onClick={() => removeCheck(i)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input style={{ ...S.input, flex: 1, marginBottom: 0 }} placeholder="Neuer Checkpunkt..." value={checkText} onChange={(e) => setCheckText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCheck()} />
        <button style={S.btn("#6c63ff")} onClick={addCheck}>+</button>
      </div>
      <label style={S.label}>Anhänge</label>
      <MilestoneFileUpload files={data.milestoneFiles || []} onChange={(f) => setData({ ...data, milestoneFiles: f })} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button style={S.btn("#10b981")} onClick={onSave}>💾 Speichern</button>
        <button style={S.btn("#6b7280")} onClick={onCancel}>Abbrechen</button>
        {onDelete && <button style={S.btn("#ef4444")} onClick={onDelete}>🗑️ Löschen</button>}
      </div>
    </div>
  );
}

function MilestoneRow({ m, ressorts, expandedId, setExpandedId, onEdit }) {
  const days = daysUntil(m.dueDate);
  const overdue = days !== null && days < 0 && m.status !== "Erledigt";
  const expanded = expandedId === m.id;
  const done = m.checklist.filter((c) => c.done).length;
  return (
    <div style={{ ...S.card, borderLeft: `4px solid ${STATUS_COLOR[m.status]}`, marginBottom: 10, cursor: "pointer" }} onClick={() => setExpandedId(expanded ? null : m.id)}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{m.title}</span>
        {m.verantwortlich && <span style={{ fontSize: 11, color: "#6b7280" }}>👤 {m.verantwortlich}</span>}
        {m.checklist.length > 0 && <span style={{ fontSize: 11, color: "#6b7280" }}>{done}/{m.checklist.length} ✓</span>}
        <span style={S.badge(PRIORITY_COLOR[m.priority])}>{m.priority}</span>
        <span style={S.badge(STATUS_COLOR[m.status])}>{m.status}</span>
        {m.dueDate && (
          <span style={{ fontSize: 12, color: overdue ? "#ef4444" : "#6b7280", fontWeight: overdue ? 700 : 400 }}>
            {overdue ? "⚠️ " : "📅 "}{m.dueDate}{overdue ? " (überfällig)" : days === 0 ? " (heute)" : ` (${days}d)`}
          </span>
        )}
        <button style={{ ...S.btn("#6c63ff"), padding: "4px 10px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); onEdit(m); }}>✏️</button>
      </div>
      {expanded && m.checklist.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f1f5f9" }}>
          {m.checklist.map((c, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 13 }}>{c.done ? "✅" : "⬜"}</span>
              <span style={{ fontSize: 13, color: c.done ? "#9ca3af" : "#374151", textDecoration: c.done ? "line-through" : "none" }}>{c.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminPage({
  adminUnlocked, adminPwInput, setAdminPwInput, adminPwError, tryAdminLogin,
  editConfig, setEditConfig, saveAdminConfig,
  newRessortLabel, setNewRessortLabel, newRessortColor, setNewRessortColor, addNewRessort,
  milestones, config, ressortFiles,
  navigateToRessort, setEditingMilestone, deleteMilestone,
  setAdminUnlocked, setAdminPwError, dbStatus,
}) {
  if (!adminUnlocked) {
    return (
      <div style={{ ...S.section, maxWidth: 400 }}>
        <div style={S.card}>
          <h2 style={{ margin: "0 0 16px" }}>🔒 Admin-Bereich</h2>
          <label style={S.label}>Passwort</label>
          <input style={S.input} type="password" value={adminPwInput} onChange={(e) => setAdminPwInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && tryAdminLogin()} placeholder="Admin-Passwort" />
          {adminPwError && <p style={{ color: "#ef4444", fontSize: 13 }}>❌ Falsches Passwort</p>}
          <button style={S.btn("#6c63ff")} onClick={tryAdminLogin}>Anmelden</button>
        </div>
      </div>
    );
  }

  const exportExcel = () => {
    const rows = [["Ressort", "Dateiname", "Betrag (€)", "Verwendungszweck", "Datum"]];
    config.ressorts.forEach((r) => {
      const files = ressortFiles[r.id] || [];
      files.forEach((f) => rows.push([r.label, f.name, parseFloat(f.amount) || 0, f.purpose || "", f.date || ""]));
    });
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const bom = "\uFEFF";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "Treibhaus_Belege.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadZip = () => {
    const allFiles = [];
    config.ressorts.forEach((r) => (ressortFiles[r.id] || []).forEach((f) => allFiles.push({ ...f, ressortLabel: r.label })));
    if (allFiles.length === 0) { alert("Keine Belege vorhanden."); return; }
    allFiles.forEach((f) => { const a = document.createElement("a"); a.href = f.dataUrl; a.download = `${f.ressortLabel}_${f.name}`; a.click(); });
  };

  const totalFiles = config.ressorts.reduce((s, r) => s + (ressortFiles[r.id] || []).length, 0);

  return (
    <div style={S.section}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>⚙️ Admin-Bereich</h2>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: dbStatus === "connected" ? "#10b981" : "#f59e0b", fontWeight: 700 }}>
            🔥 Firebase: {dbStatus === "connected" ? "✅ Verbunden" : "⏳ Verbinde..."}
          </span>
          <button style={S.btn("#6b7280")} onClick={() => { setAdminUnlocked(false); setAdminPwError(false); }}>🔒 Abmelden</button>
        </div>
      </div>

      <div style={S.card}>
        <h3 style={{ margin: "0 0 14px" }}>📦 Belege & Export</h3>
        <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 14 }}>{totalFiles} Beleg{totalFiles !== 1 ? "e" : ""} in allen Ressorts gespeichert.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={S.btn("#10b981")} onClick={exportExcel}>📊 Alle Belege als CSV/Excel exportieren</button>
          <button style={S.btn("#6c63ff")} onClick={downloadZip}>📦 Alle Belege einzeln herunterladen</button>
        </div>
      </div>

      {editConfig && (
        <div style={S.card}>
          <h3 style={{ margin: "0 0 14px" }}>🌐 Allgemeine Einstellungen</h3>
          {[{ key: "siteTitle", label: "Seitentitel" }, { key: "siteSubtitle", label: "Untertitel" }, { key: "adminPassword", label: "Admin-Passwort" }, { key: "premiereDate", label: "Premiere-Datum", type: "date" }].map(({ key, label, type }) => (
            <div key={key}>
              <label style={S.label}>{label}</label>
              <input style={S.input} type={type || "text"} value={editConfig[key] || ""} onChange={(e) => setEditConfig({ ...editConfig, [key]: e.target.value })} />
            </div>
          ))}
          <div style={{ marginBottom: 10 }}>
            <label style={S.label}>Header-Bild</label>
            <input style={S.input} type="text" placeholder="URL eingeben oder Bild hochladen..." value={editConfig.headerImage || ""} onChange={(e) => setEditConfig({ ...editConfig, headerImage: e.target.value })} />
            <HeaderImageUpload currentImage={editConfig.headerImage} onChange={(val) => setEditConfig({ ...editConfig, headerImage: val })} />
            {editConfig.headerImage && (
              <img src={editConfig.headerImage} alt="Vorschau Header" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 10, border: "1px solid #e2e8f0", marginBottom: 6 }} onError={(e) => { e.target.style.display = "none"; }} />
            )}
          </div>
          <h3 style={{ margin: "14px 0 10px" }}>🎭 Ressorts</h3>
          {editConfig.ressorts.map((r, i) => (
            <div key={r.id} style={{ marginBottom: 12, background: "#f8fafc", borderRadius: 10, padding: "10px 12px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
                <input style={{ ...S.input, flex: 2, marginBottom: 0 }} value={r.label} onChange={(e) => { const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], label: e.target.value }; setEditConfig({ ...editConfig, ressorts: rs }); }} />
                <input type="color" value={r.color} onChange={(e) => { const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], color: e.target.value }; setEditConfig({ ...editConfig, ressorts: rs }); }} style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
                <input style={{ ...S.input, flex: 1, marginBottom: 0 }} type="number" placeholder="Budget €" value={r.budget || ""} onChange={(e) => { const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], budget: parseFloat(e.target.value) || 0 }; setEditConfig({ ...editConfig, ressorts: rs }); }} />
                <button style={{ ...S.btn("#ef4444"), padding: "6px 10px" }} onClick={() => { const rs = editConfig.ressorts.filter((_, idx) => idx !== i); setEditConfig({ ...editConfig, ressorts: rs }); }}>✕</button>
              </div>
              <div>
                <label style={{ ...S.label, marginBottom: 2 }}>Verantwortlich</label>
                <input style={{ ...S.input, marginBottom: 0 }} placeholder="Name der verantwortlichen Person" value={r.verantwortlich || ""} onChange={(e) => { const rs = [...editConfig.ressorts]; rs[i] = { ...rs[i], verantwortlich: e.target.value }; setEditConfig({ ...editConfig, ressorts: rs }); }} />
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <input style={{ ...S.input, flex: 2, marginBottom: 0 }} placeholder="Neues Ressort..." value={newRessortLabel} onChange={(e) => setNewRessortLabel(e.target.value)} />
            <input type="color" value={newRessortColor} onChange={(e) => setNewRessortColor(e.target.value)} style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer", padding: 0 }} />
            <button style={S.btn("#10b981")} onClick={addNewRessort}>+ Ressort</button>
          </div>
          <button style={{ ...S.btn("#6c63ff"), marginTop: 16 }} onClick={saveAdminConfig}>💾 Einstellungen speichern</button>
        </div>
      )}

      <div style={S.card}>
        <h3 style={{ margin: "0 0 14px" }}>📋 Alle Meilensteine ({milestones.length})</h3>
        {milestones.length === 0 && <div style={{ color: "#9ca3af" }}>Keine Meilensteine vorhanden.</div>}
        {milestones.map((m) => {
          const r = config.ressorts.find((x) => x.id === m.ressort);
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9", flexWrap: "wrap" }}>
              <span style={{ ...S.badge(r?.color || "#6b7280") }}>{r?.label || m.ressort}</span>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{m.title}</span>
              {m.verantwortlich && <span style={{ fontSize: 12, color: "#6b7280" }}>👤 {m.verantwortlich}</span>}
              <span style={S.badge(STATUS_COLOR[m.status])}>{m.status}</span>
              {m.dueDate && <span style={{ fontSize: 12, color: "#6b7280" }}>📅 {m.dueDate}</span>}
              <button style={{ ...S.btn("#6c63ff"), padding: "4px 10px", fontSize: 12 }} onClick={() => navigateToRessort(m.ressort)}>→</button>
              <button style={{ ...S.btn("#ef4444"), padding: "4px 10px", fontSize: 12 }} onClick={() => deleteMilestone(m.id)}>🗑️</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HomePage({ config, milestones, ressortFiles, premiereDays, navigateToRessort }) {
  const doneCount = milestones.filter((m) => m.status === "Erledigt").length;
  const overdueCount = milestones.filter((m) => m.dueDate && daysUntil(m.dueDate) < 0 && m.status !== "Erledigt").length;
  const progress = milestones.length ? Math.round((doneCount / milestones.length) * 100) : 0;
  const totalBudget = config.ressorts.reduce((s, r) => s + (r.budget || 0), 0);
  const totalUsed = config.ressorts.reduce((s, r) => {
    const files = ressortFiles[r.id] || [];
    return s + files.reduce((sf, f) => sf + (parseFloat(f.amount) || 0), 0);
  }, 0);
  const totalAvail = totalBudget - totalUsed;
  return (
    <div>
      <div style={{ position: "relative", height: 240, overflow: "hidden" }}>
        <img src={config.headerImage} alt="Header" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.target.style.display = "none"; }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, rgba(30,27,75,0.5) 0%, rgba(30,27,75,0.85) 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center" }}>
          <h1 style={{ color: "#fff", fontSize: 28, fontWeight: 900, margin: 0 }}>{config.siteTitle}</h1>
          <p style={{ color: "rgba(255,255,255,0.85)", fontSize: 15, margin: "8px 0 14px" }}>{config.siteSubtitle}</p>
          {premiereDays !== null && (
            <div style={{ background: "rgba(255,255,255,0.18)", borderRadius: 16, padding: "7px 22px", color: "#fff", fontWeight: 800, fontSize: 17, backdropFilter: "blur(6px)" }}>
              🎭 Premiere in {premiereDays} Tagen
            </div>
          )}
        </div>
      </div>
      <div style={S.section}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Gesamt", value: milestones.length, color: "#6c63ff" },
            { label: "Erledigt", value: doneCount, color: "#10b981" },
            { label: "Überfällig", value: overdueCount, color: "#ef4444" },
            { label: "Fortschritt", value: progress + "%", color: "#3b82f6" },
          ].map((stat) => (
            <div key={stat.label} style={{ ...S.card, textAlign: "center", borderTop: `4px solid ${stat.color}`, marginBottom: 0 }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: stat.color }}>{stat.value}</div>
              <div style={{ fontSize: 11, color: "#6b7280", marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background: "#e2e8f0", borderRadius: 99, height: 10, marginBottom: 22, overflow: "hidden" }}>
          <div style={{ width: progress + "%", background: "linear-gradient(90deg,#6c63ff,#10b981)", height: "100%", borderRadius: 99, transition: "width 0.5s" }} />
        </div>
        <div style={{ ...S.card, marginBottom: 22 }}>
          <h2 style={{ margin: "0 0 12px", fontSize: 15 }}>💰 Budget-Übersicht</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 6 }}>
            <div><div style={S.label}>Gesamtbudget</div><div style={{ fontSize: 20, fontWeight: 900, color: "#1e293b" }}>{formatEUR(totalBudget)}</div></div>
            <div><div style={S.label}>Verbraucht</div><div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>{formatEUR(totalUsed)}</div></div>
            <div><div style={S.label}>Verfügbar</div><div style={{ fontSize: 20, fontWeight: 900, color: totalAvail < 0 ? "#ef4444" : "#10b981" }}>{formatEUR(totalAvail)}</div></div>
          </div>
          <BudgetBar budget={totalBudget} used={totalUsed} />
        </div>
        <h2 style={{ fontWeight: 800, marginBottom: 12 }}>Ressorts</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
          {config.ressorts.map((r) => {
            const items = milestones.filter((m) => m.ressort === r.id);
            const done = items.filter((m) => m.status === "Erledigt").length;
            const pct = items.length ? Math.round((done / items.length) * 100) : 0;
            const files = ressortFiles[r.id] || [];
            const used = files.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
            const available = (r.budget || 0) - used;
            return (
              <div key={r.id} style={{ ...S.card, borderLeft: `5px solid ${r.color}`, cursor: "pointer", marginBottom: 0 }} onClick={() => navigateToRessort(r.id)}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 2 }}>{r.label}</div>
                {r.verantwortlich && <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 5 }}>👤 {r.verantwortlich}</div>}
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>{done}/{items.length} erledigt ({pct}%)</div>
                <div style={{ background: "#e2e8f0", borderRadius: 99, height: 5, marginBottom: 8, overflow: "hidden" }}>
                  <div style={{ width: pct + "%", background: r.color, height: "100%", borderRadius: 99 }} />
                </div>
                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", display: "flex", justifyContent: "space-between" }}>
                    <span>Budget: {formatEUR(r.budget || 0)}</span>
                    <span style={{ color: available < 0 ? "#ef4444" : "#10b981", fontWeight: 700 }}>{available < 0 ? "⚠️ " : ""}{formatEUR(available)}</span>
                  </div>
                  <BudgetBar budget={r.budget || 0} used={used} />
                  <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 4 }}>{files.length} Beleg{files.length !== 1 ? "e" : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RessortPage({
  config, milestones, ressortFiles, updateRessortFiles,
  activeRessort, setPage,
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
}) {
  const ressort = config.ressorts.find((r) => r.id === activeRessort);
  if (!ressort) return <div style={S.section}>Ressort nicht gefunden.</div>;
  const filtered = milestones.filter((m) => {
    if (m.ressort !== activeRessort) return false;
    if (filterStatus !== "Alle" && m.status !== filterStatus) return false;
    if (filterPriority !== "Alle" && m.priority !== filterPriority) return false;
    if (searchText && !m.title.toLowerCase().includes(searchText.toLowerCase())) return false;
    return true;
  });
  const allItems = milestones.filter((m) => m.ressort === activeRessort);
  const ressortDone = allItems.filter((m) => m.status === "Erledigt").length;
  const ressortPct = allItems.length ? Math.round((ressortDone / allItems.length) * 100) : 0;
  const files = ressortFiles[activeRessort] || [];
  const used = files.reduce((s, f) => s + (parseFloat(f.amount) || 0), 0);
  const available = (ressort.budget || 0) - used;
  const over = available < 0;
  return (
    <div style={S.section}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <button style={S.btn("#6b7280")} onClick={() => setPage("home")}>← Zurück</button>
        <h2 style={{ margin: 0, fontWeight: 900, color: ressort.color }}>{ressort.label}</h2>
        {ressort.verantwortlich && <span style={{ fontSize: 13, color: "#6b7280" }}>👤 {ressort.verantwortlich}</span>}
        <span style={{ fontSize: 13, color: "#6b7280" }}>{ressortDone}/{allItems.length} erledigt ({ressortPct}%)</span>
      </div>
      <div style={{ background: "#e2e8f0", borderRadius: 99, height: 8, marginBottom: 18, overflow: "hidden" }}>
        <div style={{ width: ressortPct + "%", background: ressort.color, height: "100%", borderRadius: 99, transition: "width 0.4s" }} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button style={{ ...S.btn(ressortTab === "meilensteine" ? ressort.color : "#e2e8f0"), color: ressortTab === "meilensteine" ? "#fff" : "#374151" }} onClick={() => setRessortTab("meilensteine")}>📋 Meilensteine</button>
        <button style={{ ...S.btn(ressortTab === "budget" ? ressort.color : "#e2e8f0"), color: ressortTab === "budget" ? "#fff" : "#374151" }} onClick={() => setRessortTab("budget")}>💰 Budget & Belege</button>
      </div>
      {ressortTab === "meilensteine" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button style={S.btn(ressort.color)} onClick={() => { setAddingMilestone(true); setEditingMilestone(null); setNewMilestone(makeEmptyMilestone(activeRessort)); setNewCheckText(""); }}>+ Meilenstein</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
            <input style={{ ...S.input, width: 180, marginBottom: 0 }} placeholder="🔍 Suchen..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <select style={{ ...S.input, width: 160, marginBottom: 0 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>{["Alle", ...STATUSES].map((st) => <option key={st}>{st}</option>)}</select>
            <select style={{ ...S.input, width: 140, marginBottom: 0 }} value={filterPriority} onChange={(e) => setFilterPriority(e.target.value)}>{["Alle", ...PRIORITIES].map((p) => <option key={p}>{p}</option>)}</select>
            {(filterStatus !== "Alle" || filterPriority !== "Alle" || searchText) && (
              <button style={S.btn("#6b7280")} onClick={() => { setFilterStatus("Alle"); setFilterPriority("Alle"); setSearchText(""); }}>✕ Reset</button>
            )}
          </div>
          {addingMilestone && <MilestoneForm data={newMilestone} setData={setNewMilestone} onSave={addMilestone} onCancel={() => { setAddingMilestone(false); setNewCheckText(""); }} checkText={newCheckText} setCheckText={setNewCheckText} ressorts={config.ressorts} />}
          {editingMilestone && <MilestoneForm data={editingMilestone} setData={setEditingMilestone} onSave={() => saveMilestone(editingMilestone)} onCancel={() => { setEditingMilestone(null); setEditCheckText(""); }} onDelete={() => deleteMilestone(editingMilestone.id)} checkText={editCheckText} setCheckText={setEditCheckText} ressorts={config.ressorts} />}
          {filtered.length === 0 ? (
            <div style={{ color: "#9ca3af", textAlign: "center", padding: 40 }}>Keine Meilensteine gefunden.</div>
          ) : (
            filtered.map((m) => <MilestoneRow key={m.id} m={m} ressorts={config.ressorts} expandedId={expandedId} setExpandedId={setExpandedId} onEdit={(m) => { setEditingMilestone({ ...m }); setAddingMilestone(false); setEditCheckText(""); }} />)
          )}
        </div>
      )}
      {ressortTab === "budget" && (
        <div>
          <div style={S.card}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 20, marginBottom: 8 }}>
              <div><div style={S.label}>Gesamtbudget</div><div style={{ fontSize: 20, fontWeight: 900, color: "#1e293b" }}>{formatEUR(ressort.budget || 0)}</div></div>
              <div><div style={S.label}>Verbraucht</div><div style={{ fontSize: 20, fontWeight: 900, color: "#f59e0b" }}>{formatEUR(used)}</div></div>
              <div><div style={S.label}>Verfügbar</div><div style={{ fontSize: 20, fontWeight: 900, color: over ? "#ef4444" : "#10b981" }}>{formatEUR(available)}</div></div>
            </div>
            <BudgetBar budget={ressort.budget || 0} used={used} />
            {over && <p style={{ color: "#ef4444", fontSize: 13, marginTop: 6, fontWeight: 600 }}>⚠️ Budget überschritten um {formatEUR(Math.abs(available))}</p>}
          </div>
          <div style={S.card}>
            <h3 style={{ margin: "0 0 10px" }}>📎 Rechnungen & Belege</h3>
            <FileUpload files={files} onChange={(f) => updateRessortFiles(activeRessort, f)} label="Belege hochladen" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [config, setConfig] = useState(INIT_CONFIG);
  const [milestones, setMilestones] = useState([]);
  const [page, setPage] = useState("home");
  const [activeRessort, setActiveRessort] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [ressortFiles, setRessortFiles] = useState({});
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [adminPwError, setAdminPwError] = useState(false);
  const [editConfig, setEditConfig] = useState(null);
  const [newRessortLabel, setNewRessortLabel] = useState("");
  const [newRessortColor, setNewRessortColor] = useState("#6c63ff");
  const [editingMilestone, setEditingMilestone] = useState(null);
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [newMilestone, setNewMilestone] = useState(makeEmptyMilestone("regie"));
  const [newCheckText, setNewCheckText] = useState("");
  const [editCheckText, setEditCheckText] = useState("");
  const [filterStatus, setFilterStatus] = useState("Alle");
  const [filterPriority, setFilterPriority] = useState("Alle");
  const [searchText, setSearchText] = useState("");
  const [ressortTab, setRessortTab] = useState("meilensteine");
  const [loading, setLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState("connecting");
  const [platformUnlocked, setPlatformUnlocked] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const configDoc = await getDoc(doc(db, "app", "config"));
        if (configDoc.exists()) {
          setConfig(configDoc.data());
        } else {
          await setDoc(doc(db, "app", "config"), INIT_CONFIG);
        }
        const msSnap = await getDocs(collection(db, "milestones"));
        if (msSnap.empty) {
          for (const m of INIT_MILESTONES) {
            await setDoc(doc(db, "milestones", m.id), m);
          }
          setMilestones(INIT_MILESTONES);
        } else {
          setMilestones(msSnap.docs.map((d) => ({ ...d.data(), id: d.id })));
        }
        const rfSnap = await getDocs(collection(db, "ressortFiles"));
        const rf = {};
        rfSnap.docs.forEach((d) => { rf[d.id] = d.data().files || []; });
        setRessortFiles(rf);
        setDbStatus("connected");
      } catch (e) {
        console.error("Firebase load error:", e);
        setDbStatus("error");
        setMilestones(INIT_MILESTONES);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const premiereDays = daysUntil(config.premiereDate);

  const tryAdminLogin = () => {
    if (adminPwInput === config.adminPassword) {
      setAdminUnlocked(true); setAdminPwError(false);
      setEditConfig({ ...config, ressorts: config.ressorts.map((r) => ({ ...r })) });
    } else { setAdminPwError(true); }
  };

  const saveAdminConfig = async () => {
    setConfig({ ...editConfig });
    try {
      await setDoc(doc(db, "app", "config"), editConfig);
    } catch (e) { console.error("Save config error:", e); }
  };

  const saveMilestone = async (m) => {
    if (!m.title.trim()) return;
    setMilestones((prev) => prev.map((x) => x.id === m.id ? m : x));
    setEditingMilestone(null); setEditCheckText("");
    try {
      await setDoc(doc(db, "milestones", String(m.id)), m);
    } catch (e) { console.error("Save milestone error:", e); }
  };

  const deleteMilestone = async (id) => {
    if (!window.confirm("Meilenstein wirklich löschen?")) return;
    setMilestones((prev) => prev.filter((m) => m.id !== id));
    setEditingMilestone(null);
    try {
      await deleteDoc(doc(db, "milestones", String(id)));
    } catch (e) { console.error("Delete milestone error:", e); }
  };

  const addMilestone = async () => {
    if (!newMilestone.title.trim()) return;
    const newId = String(Date.now());
    const m = { ...newMilestone, id: newId };
    setMilestones((prev) => [...prev, m]);
    setAddingMilestone(false);
    setNewMilestone(makeEmptyMilestone(activeRessort));
    setNewCheckText("");
    try {
      await setDoc(doc(db, "milestones", newId), m);
    } catch (e) { console.error("Add milestone error:", e); }
  };

  const navigateToRessort = (ressortId) => {
    setActiveRessort(ressortId); setPage("ressort");
    setAddingMilestone(false); setEditingMilestone(null); setExpandedId(null);
    setFilterStatus("Alle"); setFilterPriority("Alle"); setSearchText("");
    setRessortTab("meilensteine");
  };

  const updateRessortFiles = async (ressortId, files) => {
    setRessortFiles((prev) => ({ ...prev, [ressortId]: files }));
    try {
      await setDoc(doc(db, "ressortFiles", ressortId), { files });
    } catch (e) { console.error("Save ressortFiles error:", e); }
  };

  const addNewRessort = () => {
    if (!newRessortLabel.trim()) return;
    const id = newRessortLabel.replace(/[^a-z0-9]/gi, "").toLowerCase() + Date.now();
    setEditConfig({ ...editConfig, ressorts: [...editConfig.ressorts, { id, label: newRessortLabel.trim(), color: newRessortColor, budget: 0, verantwortlich: "" }] });
    setNewRessortLabel("");
  };

  if (!platformUnlocked) {
    return <LoginGate onUnlock={() => setPlatformUnlocked(true)} />;
  }

  if (loading) {
    return (
      <div style={{ ...S.app, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48 }}>🔥</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#6c63ff" }}>Verbinde mit Firebase...</div>
        <div style={{ fontSize: 13, color: "#9ca3af" }}>Daten werden geladen</div>
      </div>
    );
  }

  return (
    <div style={S.app}>
      <nav style={S.nav}>
        <span style={S.navTitle}>🎭 Treibhaus</span>
        <button style={S.navBtn(page === "home")} onClick={() => setPage("home")}>🏠 Start</button>
        {config.ressorts.map((r) => (
          <button key={r.id} style={S.navBtn(page === "ressort" && activeRessort === r.id)} onClick={() => navigateToRessort(r.id)}>{r.label}</button>
        ))}
        <button style={S.navBtn(page === "admin")} onClick={() => setPage("admin")}>⚙️ Admin</button>
      </nav>
      {page === "home" && <HomePage config={config} milestones={milestones} ressortFiles={ressortFiles} premiereDays={premiereDays} navigateToRessort={navigateToRessort} />}
      {page === "ressort" && (
        <RessortPage
          config={config} milestones={milestones} ressortFiles={ressortFiles} updateRessortFiles={updateRessortFiles}
          activeRessort={activeRessort}
          setPage={setPage}
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
          setAdminUnlocked={setAdminUnlocked} setAdminPwError={setAdminPwError}
          dbStatus={dbStatus}
        />
      )}
    </div>
  );
}
