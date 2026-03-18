import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { collection, addDoc, getDocs, orderBy, query } from "firebase/firestore";
import { gsap } from "gsap";
import Swal from "sweetalert2";
import {
  ArrowLeft, TrendingUp, Flame, Calendar,
  Plus, X, CheckCircle2, BarChart2,
  Weight, Zap, Clock, Trophy, Target, Activity,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell,
  RadialBarChart, RadialBar, AreaChart, Area,
} from "recharts";
import "./Progress.css";

interface Entry {
  id?: string;
  fecha: string;
  peso: number;
  esfuerzo: number;
  duracion: number;
  notas: string;
  created_at: string;
}

const Alert = Swal.mixin({
  background: "#111", color: "#f0f0f0",
  confirmButtonColor: "#ff4a2b", cancelButtonColor: "#222", iconColor: "#ff4a2b",
  customClass: { popup: "swal-ts-popup", title: "swal-ts-title", confirmButton: "swal-ts-btn" },
});

const MOCK: Entry[] = [
  { fecha: "2026-02-20", peso: 84,   esfuerzo: 5, duracion: 40, notas: "Primera sesión", created_at: "" },
  { fecha: "2026-02-24", peso: 83.5, esfuerzo: 6, duracion: 45, notas: "", created_at: "" },
  { fecha: "2026-02-27", peso: 83,   esfuerzo: 7, duracion: 50, notas: "Bien", created_at: "" },
  { fecha: "2026-03-01", peso: 83,   esfuerzo: 6, duracion: 45, notas: "", created_at: "" },
  { fecha: "2026-03-04", peso: 82.5, esfuerzo: 7, duracion: 50, notas: "", created_at: "" },
  { fecha: "2026-03-07", peso: 82,   esfuerzo: 8, duracion: 55, notas: "Excelente", created_at: "" },
  { fecha: "2026-03-10", peso: 81.8, esfuerzo: 7, duracion: 45, notas: "", created_at: "" },
  { fecha: "2026-03-13", peso: 81.5, esfuerzo: 9, duracion: 60, notas: "Mejor semana", created_at: "" },
  { fecha: "2026-03-16", peso: 81,   esfuerzo: 8, duracion: 50, notas: "", created_at: "" },
];

const esfuerzoColor = (e: number) => e <= 3 ? "#22c55e" : e <= 6 ? "#f59e0b" : e <= 8 ? "#ff4a2b" : "#dc2626";
const esfuerzoLabel = (e: number) => e <= 3 ? "Suave" : e <= 6 ? "Moderado" : e <= 8 ? "Intenso" : "Máximo";
const fmt = (f: string) => { const [,m,d] = f.split("-"); return `${d}/${m}`; };

export default function Progress() {
  const navigate = useNavigate();
  const user = auth.currentUser;

  const [entries, setEntries]   = useState<Entry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState<"peso" | "esfuerzo" | "duracion">("peso");

  const [peso, setPeso]         = useState("");
  const [esfuerzo, setEsfuerzo] = useState(5);
  const [duracion, setDuracion] = useState("");
  const [notas, setNotas]       = useState("");

  const headerRef = useRef<HTMLElement>(null);
  const formRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const q = query(collection(db, "progress", user.uid, "entries"), orderBy("fecha", "asc"));
    getDocs(q).then(snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() } as Entry)));
    }).finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    if (loading) return;
    const ctx = gsap.context(() => {
      gsap.timeline({ defaults: { ease: "power3.out" } })
        .fromTo(headerRef.current,  { y: -20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5 })
        .fromTo(".pr-stat",         { y: 24, opacity: 0 },  { y: 0, opacity: 1, stagger: 0.07, duration: 0.35 }, "-=0.2")
        .fromTo(".pr-chart-card",   { y: 28, opacity: 0 },  { y: 0, opacity: 1, stagger: 0.1, duration: 0.4 }, "-=0.1")
        .fromTo(".pr-hist",         { y: 28, opacity: 0 },  { y: 0, opacity: 1, duration: 0.4 }, "-=0.2");
    });
    return () => ctx.revert();
  }, [loading]);

  useEffect(() => {
    if (showForm && formRef.current)
      gsap.fromTo(formRef.current, { y: -12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.25, ease: "power3.out" });
  }, [showForm]);

  const displayData  = entries.length > 0 ? entries : MOCK;
  const isMock       = entries.length === 0;
  const lastEntry    = displayData[displayData.length - 1];
  const firstEntry   = displayData[0];
  const diferencia   = parseFloat(((lastEntry?.peso ?? 0) - (firstEntry?.peso ?? 0)).toFixed(1));
  const promEsfuerzo = parseFloat((displayData.reduce((a, e) => a + e.esfuerzo, 0) / displayData.length).toFixed(1));
  const promDuracion = Math.round(displayData.reduce((a, e) => a + e.duracion, 0) / displayData.length);
  const totalMins    = displayData.reduce((a, e) => a + e.duracion, 0);

  const racha = (() => {
    const fechas = new Set(displayData.map(e => e.fecha));
    let streak = 0;
    let d = new Date();
    while (true) {
      const key = d.toISOString().split("T")[0];
      if (!fechas.has(key)) break;
      streak++;
      d.setDate(d.getDate() - 1);
    }
    return streak;
  })();

  const radialData = [{ name: "Esfuerzo", value: promEsfuerzo * 10, fill: esfuerzoColor(promEsfuerzo) }];
  const histVisible = [...displayData].reverse();

  const handleSave = async () => {
    if (!peso || Number(peso) < 30 || Number(peso) > 300) { Alert.fire({ icon: "warning", title: "Peso inválido", text: "Entre 30 y 300 kg." }); return; }
    if (!duracion || Number(duracion) < 5) { Alert.fire({ icon: "warning", title: "Duración inválida", text: "Mínimo 5 minutos." }); return; }
    if (!user) return;
    setSaving(true);
    try {
      const entry: Entry = {
        fecha: new Date().toISOString().split("T")[0],
        peso: Number(peso), esfuerzo, duracion: Number(duracion),
        notas: notas.trim(), created_at: new Date().toISOString(),
      };
      const ref = await addDoc(collection(db, "progress", user.uid, "entries"), entry);
      setEntries(prev => [...prev, { ...entry, id: ref.id }]);
      setPeso(""); setEsfuerzo(5); setDuracion(""); setNotas(""); setShowForm(false);
      await Alert.fire({ icon: "success", title: "¡Sesión registrada!", timer: 2000, showConfirmButton: false });
    } catch {
      Alert.fire({ icon: "error", title: "Error al guardar", text: "Intentá de nuevo." });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="ts-loading"><span className="ts-spin" /></div>;

  return (
    // ← CAMBIO: agregado onTouchStart para activar scroll en iOS WebView
    <div className="pr" onTouchStart={() => {}}>

      {/* Header */}
      <header className="pr-header" ref={headerRef}>
        <button className="pr-back" onClick={() => navigate("/home", { replace: true })}>
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="pr-logo">Train<span>Smart</span> <em>AI</em></div>
        <button className="pr-btn-add" onClick={() => setShowForm(v => !v)}>
          {showForm ? <X size={15} /> : <Plus size={15} />}
          <span>{showForm ? "Cancelar" : "Registrar sesión"}</span>
        </button>
      </header>

      <div className="pr-content">

        {/* Mock banner */}
        {isMock && (
          <div className="pr-mock-banner">
            <Zap size={13} /> Datos de ejemplo — registrá tu primera sesión para ver tu progreso real
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="pr-form" ref={formRef}>
            <div className="pr-form-head">
              <h3>Nueva sesión</h3>
              <button className="pr-form-close" onClick={() => setShowForm(false)}><X size={15} /></button>
            </div>
            <div className="pr-form-grid">
              <div className="pr-field">
                <label>Peso (kg)</label>
                <input type="number" placeholder="80" min={30} max={300} step={0.1} value={peso} onChange={e => setPeso(e.target.value)} />
              </div>
              <div className="pr-field">
                <label>Duración (min)</label>
                <input type="number" placeholder="45" min={5} max={240} value={duracion} onChange={e => setDuracion(e.target.value)} />
              </div>
              <div className="pr-field pr-field--full">
                <label>Esfuerzo: <strong style={{ color: esfuerzoColor(esfuerzo) }}>{esfuerzo}/10 — {esfuerzoLabel(esfuerzo)}</strong></label>
                <input type="range" min={1} max={10} value={esfuerzo} onChange={e => setEsfuerzo(Number(e.target.value))}
                  className="pr-slider" style={{ "--thumb-color": esfuerzoColor(esfuerzo) } as React.CSSProperties} />
                <div className="pr-slider-labels"><span>Suave</span><span>Moderado</span><span>Intenso</span><span>Máximo</span></div>
              </div>
              <div className="pr-field pr-field--full">
                <label>Notas (opcional)</label>
                <input type="text" placeholder="¿Cómo te sentiste?" value={notas} onChange={e => setNotas(e.target.value)} />
              </div>
            </div>
            <button className="pr-btn-save" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="pr-spin" /> Guardando...</> : <><CheckCircle2 size={15} /> Guardar sesión</>}
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="pr-stats">
          {[
            { icon: <Weight size={16} />,    label: "Peso actual",    val: `${lastEntry?.peso ?? 0} kg`,                            color: "#ff4a2b" },
            { icon: <TrendingUp size={16} />, label: "Variación",      val: `${diferencia > 0 ? "+" : ""}${diferencia} kg`,          color: diferencia <= 0 ? "#22c55e" : "#ef4444" },
            { icon: <Flame size={16} />,      label: "Sesiones",       val: String(displayData.length),                              color: "#f59e0b" },
            { icon: <Clock size={16} />,      label: "Tiempo total",   val: `${totalMins} min`,                                      color: "#8b5cf6" },
            { icon: <Activity size={16} />,   label: "Duración media", val: `${promDuracion} min`,                                   color: "#06b6d4" },
            { icon: <Target size={16} />,     label: "Racha actual",   val: racha > 0 ? `${racha} días` : "0 días",                  color: "#f97316" },
          ].map(({ icon, label, val, color }) => (
            <div key={label} className="pr-stat">
              <div className="pr-stat-icon" style={{ background: `${color}18`, color }}>{icon}</div>
              <div className="pr-stat-body">
                <span className="pr-stat-label">{label}</span>
                <span className="pr-stat-val" style={{ color }}>{val}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div className="pr-charts-grid">

          <div className="pr-chart-card pr-chart-card--main">
            <div className="pr-chart-top">
              <div className="pr-tabs">
                {(["peso", "esfuerzo", "duracion"] as const).map(t => (
                  <button key={t} className={`pr-tab${activeTab === t ? " pr-tab--on" : ""}`} onClick={() => setActiveTab(t)}>
                    {t === "peso" ? <><TrendingUp size={12} /> Peso</> : t === "esfuerzo" ? <><Flame size={12} /> Esfuerzo</> : <><Clock size={12} /> Duración</>}
                  </button>
                ))}
              </div>
            </div>

            {activeTab === "peso" && (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff4a2b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ff4a2b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                    labelFormatter={(l: unknown) => fmt(String(l))} formatter={(v: unknown) => [`${v} kg`, "Peso"]} />
                  <Area type="monotone" dataKey="peso" stroke="#ff4a2b" strokeWidth={2.5} fill="url(#pesoGrad)"
                    dot={{ fill: "#ff4a2b", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, fill: "#ff6a4a" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}

            {activeTab === "esfuerzo" && (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                    labelFormatter={(l: unknown) => fmt(String(l))} formatter={(v: unknown) => [`${v}/10`, "Esfuerzo"]} />
                  <Bar dataKey="esfuerzo" radius={[4, 4, 0, 0]}>
                    {displayData.map((e, i) => <Cell key={i} fill={esfuerzoColor(e.esfuerzo)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === "duracion" && (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="durGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="fecha" tickFormatter={fmt} tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1a1a1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}
                    labelFormatter={(l: unknown) => fmt(String(l))} formatter={(v: unknown) => [`${v} min`, "Duración"]} />
                  <Area type="monotone" dataKey="duracion" stroke="#8b5cf6" strokeWidth={2.5} fill="url(#durGrad)"
                    dot={{ fill: "#8b5cf6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="pr-chart-card pr-chart-card--radial">
            <div className="pr-chart-label"><Zap size={14} /> Esfuerzo promedio</div>
            <div className="pr-radial-wrap">
              <ResponsiveContainer width="100%" height={140}>
                <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="85%"
                  data={radialData} startAngle={90} endAngle={-270}>
                  <RadialBar dataKey="value" cornerRadius={8} background={{ fill: "rgba(255,255,255,0.05)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pr-radial-center">
                <span className="pr-radial-val" style={{ color: esfuerzoColor(promEsfuerzo) }}>{promEsfuerzo}</span>
                <span className="pr-radial-sub">{esfuerzoLabel(promEsfuerzo)}</span>
              </div>
            </div>
          </div>

        </div>

        {/* Historial */}
        <div className="pr-hist">
          <div className="pr-hist-head">
            <div className="pr-hist-title"><BarChart2 size={15} /> Historial de sesiones</div>
            {isMock && <span className="pr-mock-tag">Ejemplo</span>}
          </div>

          <div className="pr-hist-list">
            {histVisible.map((e, i) => (
              <div key={i} className="pr-hist-item">
                <div className="pr-hist-left">
                  <div className="pr-hist-dot" style={{ background: esfuerzoColor(e.esfuerzo) }} />
                  <div>
                    <span className="pr-hist-date">
                      {new Date(e.fecha + "T12:00:00").toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
                    </span>
                    {e.notas && <span className="pr-hist-nota">"{e.notas}"</span>}
                  </div>
                </div>
                <div className="pr-hist-chips">
                  <span className="pr-hist-chip"><Weight size={11} /> {e.peso} kg</span>
                  <span className="pr-hist-chip"><Clock size={11} /> {e.duracion} min</span>
                  <span className="pr-hist-chip" style={{ color: esfuerzoColor(e.esfuerzo), borderColor: `${esfuerzoColor(e.esfuerzo)}40` }}>
                    <Flame size={11} /> {esfuerzoLabel(e.esfuerzo)}
                  </span>
                </div>
                <div className="pr-hist-bar-wrap">
                  <div className="pr-hist-bar">
                    <div className="pr-hist-bar-fill" style={{ width: `${e.esfuerzo * 10}%`, background: esfuerzoColor(e.esfuerzo) }} />
                  </div>
                  <span className="pr-hist-eff" style={{ color: esfuerzoColor(e.esfuerzo) }}>{e.esfuerzo}/10</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Trophy */}
        {!isMock && entries.length >= 5 && (
          <div className="pr-trophy">
            <Trophy size={18} /> ¡{entries.length} sesiones completadas! Seguí así.
          </div>
        )}

      </div>
    </div>
  );
}