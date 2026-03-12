import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { gsap } from "gsap";
import Swal from "sweetalert2";
import { useBlockNavigation } from "../hooks/useBlockNavigation";
import {
  User, Calendar, Weight, Ruler, Target, Clock,
  Dumbbell, Edit3, ArrowLeft, CheckCircle2,
  Activity, Flame, Zap, TrendingUp,
} from "lucide-react";
import "./Profile.css";

const Alert = Swal.mixin({
  background: "#111",
  color: "#f5f5f5",
  confirmButtonColor: "#ff4a2b",
  cancelButtonColor: "#222",
  iconColor: "#ff4a2b",
  customClass: { popup: "swal-ts-popup", title: "swal-ts-title", confirmButton: "swal-ts-btn" },
});

const steps = ["Datos personales", "Condición física", "Objetivos"];

function calcIMC(weight: number, heightCm: number): number {
  const h = heightCm / 100;
  return parseFloat((weight / (h * h)).toFixed(1));
}

function imcCategory(imc: number) {
  if (imc < 18.5) return { label: "Bajo peso", color: "#60a5fa" };
  if (imc < 25)   return { label: "Normal",    color: "#32c878" };
  if (imc < 30)   return { label: "Sobrepeso", color: "#f0c040" };
  return              { label: "Obesidad",   color: "#ff4a2b" };
}

const goalLabel: Record<string, { label: string; icon: React.ReactNode }> = {
  lose_fat:        { label: "Perder grasa",   icon: <Flame size={16} /> },
  gain_muscle:     { label: "Ganar músculo",  icon: <Dumbbell size={16} /> },
  general_fitness: { label: "Estar activo",   icon: <Activity size={16} /> },
  strength:        { label: "Ganar fuerza",   icon: <TrendingUp size={16} /> },
};

const sexLabel: Record<string, string> = {
  male: "Masculino", female: "Femenino", other: "Otro",
};

const expLabel: Record<string, string> = {
  beginner: "Principiante", returning: "Regresando", intermediate: "Intermedio",
};

interface ProfileData {
  name: string; email: string; birthdate: string; age: number;
  sex: string; weight_kg: number; height_cm: number;
  imc: number; imc_category: string; experience_level: string;
  goal: string; days_per_week: number; time_per_session: string;
  completed: boolean;
}

/* ── Vista Resumen ─────────────────────────────────────── */
function ProfileSummary({ profile, onEdit }: { profile: ProfileData; onEdit: () => void }) {
  const navigate = useNavigate();
  const cardRef  = useRef<HTMLDivElement>(null);
  const user     = auth.currentUser;
  const imcCat   = imcCategory(profile.imc);
  const firstName = profile.name?.split(" ")[0] ?? "Usuario";

  useBlockNavigation(); // ← dentro del componente ✅

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo(cardRef.current, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55 });
    const items = document.querySelectorAll(".pf-sum-item");
    if (items.length) tl.fromTo(items,
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.06, duration: 0.3 }, "-=0.3"
    );
  }, []);

  return (
    <div className="pf">
      <header className="pf-header">
        <button className="pf-back" onClick={() => navigate("/home", { replace: true })}>
          <ArrowLeft size={15} /> <span>Dashboard</span>
        </button>
        <div className="pf-logo">Train<span>Smart</span> <em>AI</em></div>
        <div className="pf-header-badge">
          <CheckCircle2 size={13} /> <span>Perfil completo</span>
        </div>
      </header>

      <main className="pf-sum-main">
        <div className="pf-sum-card" ref={cardRef}>
          <div className="pf-sum-hero">
            <div className="pf-sum-avatar">
              {user?.photoURL
                ? <img src={user.photoURL} alt={firstName} referrerPolicy="no-referrer" />
                : <span>{firstName[0].toUpperCase()}</span>
              }
            </div>
            <div className="pf-sum-hero-info">
              <h2 className="pf-sum-name">{profile.name}</h2>
            </div>
            <button className="pf-sum-edit-btn" onClick={onEdit}>
              <Edit3 size={15} /> <span>Editar</span>
            </button>
          </div>

          <div className="pf-sum-imc">
            <div className="pf-sum-imc-left">
              <span className="pf-sum-imc-val" style={{ color: imcCat.color }}>{profile.imc}</span>
              <span className="pf-sum-imc-tag">IMC</span>
            </div>
            <div className="pf-sum-imc-right">
              <span className="pf-sum-imc-cat" style={{ color: imcCat.color }}>{imcCat.label}</span>
              <div className="pf-imc-bar">
                <div className="pf-imc-seg" style={{ background: "#60a5fa" }} />
                <div className="pf-imc-seg" style={{ background: "#32c878" }} />
                <div className="pf-imc-seg" style={{ background: "#f0c040" }} />
                <div className="pf-imc-seg" style={{ background: "#ff4a2b" }} />
                <div className="pf-imc-marker"
                  style={{ left: `${Math.min(Math.max((profile.imc - 15) / 25 * 100, 0), 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="pf-sum-grid">
            {[
              { icon: <Calendar size={16} />, label: "Edad",          val: `${profile.age} años` },
              { icon: <User size={16} />,     label: "Sexo",          val: sexLabel[profile.sex] ?? profile.sex },
              { icon: <Weight size={16} />,   label: "Peso",          val: `${profile.weight_kg} kg` },
              { icon: <Ruler size={16} />,    label: "Altura",        val: `${profile.height_cm} cm` },
              { icon: <Zap size={16} />,      label: "Experiencia",   val: expLabel[profile.experience_level] ?? profile.experience_level },
              { icon: goalLabel[profile.goal]?.icon ?? <Target size={16} />, label: "Objetivo", val: goalLabel[profile.goal]?.label ?? profile.goal },
              { icon: <Calendar size={16} />, label: "Días/semana",   val: `${profile.days_per_week} días` },
              { icon: <Clock size={16} />,    label: "Tiempo/sesión", val: `${profile.time_per_session} min` },
            ].map(({ icon, label, val }) => (
              <div key={label} className="pf-sum-item">
                <span className="pf-sum-item-icon">{icon}</span>
                <div>
                  <span className="pf-sum-item-label">{label}</span>
                  <span className="pf-sum-item-val">{val}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Formulario (nuevo + edición) ──────────────────────── */
function ProfileForm({ existing, onSaved, onCancel }: { existing: ProfileData | null; onSaved: (p: ProfileData) => void; onCancel?: () => void }) {
  const navigate  = useNavigate();
  const user      = auth.currentUser;
  const isEdit    = !!existing;

  useBlockNavigation(); // ← dentro del componente ✅

  const [step, setStep]     = useState(0);
  const [saving, setSaving] = useState(false);

  const [name, setName]             = useState(existing?.name ?? user?.displayName ?? "");
  const [birthdate, setBirthdate]   = useState(existing?.birthdate ?? "");
  const [sex, setSex]               = useState(existing?.sex ?? "");
  const [weight, setWeight]         = useState(existing?.weight_kg ? String(existing.weight_kg) : "");
  const [height, setHeight]         = useState(existing?.height_cm ? String(existing.height_cm) : "");
  const [experience, setExperience] = useState(existing?.experience_level ?? "");
  const [goal, setGoal]             = useState(existing?.goal ?? "");
  const [daysPerWeek, setDaysPerWeek]       = useState(existing?.days_per_week ? String(existing.days_per_week) : "");
  const [timePerSession, setTimePerSession] = useState(existing?.time_per_session ?? "");

  const imc    = weight && height ? calcIMC(Number(weight), Number(height)) : null;
  const imcCat = imc ? imcCategory(imc) : null;
  const age    = birthdate
    ? Math.floor((Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  const validateStep = () => {
    if (step === 0) {
      if (!name.trim()) { Alert.fire({ icon: "warning", title: "Falta tu nombre" }); return false; }
      if (!birthdate)   { Alert.fire({ icon: "warning", title: "Falta tu fecha de nacimiento" }); return false; }
      if (!sex)         { Alert.fire({ icon: "warning", title: "Seleccioná tu sexo" }); return false; }
    }
    if (step === 1) {
      if (!weight || Number(weight) < 30 || Number(weight) > 300) { Alert.fire({ icon: "warning", title: "Peso inválido", text: "Entre 30 y 300 kg." }); return false; }
      if (!height || Number(height) < 100 || Number(height) > 250) { Alert.fire({ icon: "warning", title: "Altura inválida", text: "Entre 100 y 250 cm." }); return false; }
      if (!experience) { Alert.fire({ icon: "warning", title: "Seleccioná tu nivel de experiencia" }); return false; }
    }
    if (step === 2) {
      if (!goal)           { Alert.fire({ icon: "warning", title: "Seleccioná tu objetivo" }); return false; }
      if (!daysPerWeek)    { Alert.fire({ icon: "warning", title: "Seleccioná los días por semana" }); return false; }
      if (!timePerSession) { Alert.fire({ icon: "warning", title: "Seleccioná el tiempo por sesión" }); return false; }
    }
    return true;
  };

  const next = () => { if (validateStep()) setStep(s => s + 1); };
  const back = () => setStep(s => s - 1);

  const handleSave = async () => {
    if (!validateStep() || !user) return;
    setSaving(true);
    Alert.fire({ title: "Guardando...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });

    try {
      const profileData: ProfileData = {
        name: name.trim(), email: user.email ?? "",
        birthdate, age: age ?? 0, sex,
        weight_kg: Number(weight), height_cm: Number(height),
        imc: imc ?? 0, imc_category: imcCat?.label ?? "",
        experience_level: experience, goal,
        days_per_week: Number(daysPerWeek),
        time_per_session: timePerSession,
        completed: true,
      };

      await setDoc(doc(db, "profiles", user.uid), {
        ...profileData, uid: user.uid,
        updated_at: new Date().toISOString(),
        ...(!isEdit && { created_at: new Date().toISOString() }),
      });

      await Alert.fire({
        icon: "success",
        title: isEdit ? "¡Perfil actualizado!" : "¡Perfil guardado!",
        text: isEdit ? "Tus cambios fueron guardados." : "Ahora completá tu historial de salud.",
        timer: 2000,
        showConfirmButton: false,
      });

      if (isEdit) onSaved(profileData);
      else navigate("/dashboard", { replace: true });
    } catch {
      Alert.fire({ icon: "error", title: "Error al guardar", text: "Intentá de nuevo." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pf">
      <header className="pf-header">
        {isEdit && (
          <button className="pf-back" onClick={() => onCancel?.()}>
            <ArrowLeft size={15} /> <span>Cancelar</span>
          </button>
        )}
        <div className="pf-logo">Train<span>Smart</span> <em>AI</em></div>
        <div className="pf-user">
          <span>{user?.email}</span>
          <button className="pf-logout" onClick={() => { auth.signOut(); navigate("/", { replace: true }); }}>Salir</button>
        </div>
      </header>

      <main className="pf-main">
        <div className="pf-stepper">
          {steps.map((s, i) => (
            <div key={i} className={`pf-step${i === step ? " pf-step--active" : i < step ? " pf-step--done" : ""}`}>
              <div className="pf-step-num">{i < step ? "✓" : i + 1}</div>
              <span>{s}</span>
            </div>
          ))}
          <div className="pf-step-bar">
            <div className="pf-step-fill" style={{ width: `${(step / (steps.length - 1)) * 100}%` }} />
          </div>
        </div>

        <div className="pf-card">
          {step === 0 && (
            <div className="pf-section">
              <h2 className="pf-title">Datos personales</h2>
              <p className="pf-sub">Necesitamos conocerte para personalizar tu experiencia.</p>
              <div className="pf-grid">
                <div className="pf-field pf-field--full">
                  <label>Nombre completo</label>
                  <input type="text" placeholder="Juan García" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div className="pf-field">
                  <label>Fecha de nacimiento</label>
                  <input type="date" value={birthdate} onChange={e => setBirthdate(e.target.value)}
                    max={new Date(Date.now() - 16 * 365.25 * 24 * 3600 * 1000).toISOString().split("T")[0]} />
                  {age !== null && <span className="pf-hint">{age} años</span>}
                </div>
                <div className="pf-field">
                  <label>Sexo</label>
                  <div className="pf-opts">
                    {[["male","Masculino","♂"],["female","Femenino","♀"],["other","Otro","⚧"]].map(([v,l,icon]) => (
                      <button key={v} type="button" className={`pf-opt${sex===v?" pf-opt--on":""}`} onClick={() => setSex(v)}>
                        <span className="pf-opt-icon">{icon}</span><span>{l}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="pf-section">
              <h2 className="pf-title">Condición física</h2>
              <p className="pf-sub">Esta información calcula tu IMC y adapta la intensidad de tu rutina.</p>
              <div className="pf-grid">
                <div className="pf-field">
                  <label>Peso (kg)</label>
                  <input type="number" placeholder="70" min={30} max={300} value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
                <div className="pf-field">
                  <label>Altura (cm)</label>
                  <input type="number" placeholder="170" min={100} max={250} value={height} onChange={e => setHeight(e.target.value)} />
                </div>
                {imc !== null && imcCat && (
                  <div className="pf-field pf-field--full">
                    <div className="pf-imc">
                      <div className="pf-imc-value" style={{ color: imcCat.color }}>{imc}</div>
                      <div className="pf-imc-info">
                        <span className="pf-imc-label">Índice de Masa Corporal</span>
                        <span className="pf-imc-cat" style={{ color: imcCat.color }}>{imcCat.label}</span>
                      </div>
                    </div>
                    <div className="pf-imc-bar">
                      <div className="pf-imc-seg" style={{ background: "#60a5fa" }} />
                      <div className="pf-imc-seg" style={{ background: "#32c878" }} />
                      <div className="pf-imc-seg" style={{ background: "#f0c040" }} />
                      <div className="pf-imc-seg" style={{ background: "#ff4a2b" }} />
                      <div className="pf-imc-marker" style={{ left: `${Math.min(Math.max((imc-15)/25*100,0),100)}%` }} />
                    </div>
                    <div className="pf-imc-scale"><span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span></div>
                  </div>
                )}
                <div className="pf-field pf-field--full">
                  <label>Nivel de experiencia</label>
                  <div className="pf-opts">
                    {[["beginner","Principiante","0–6 meses"],["returning","Regresando","Pausa larga"],["intermediate","Intermedio","6+ meses"]].map(([v,l,sub]) => (
                      <button key={v} type="button" className={`pf-opt pf-opt--tall${experience===v?" pf-opt--on":""}`} onClick={() => setExperience(v)}>
                        <span className="pf-opt-title">{l}</span><span className="pf-opt-sub">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="pf-section">
              <h2 className="pf-title">Tus objetivos</h2>
              <p className="pf-sub">La IA usará esto para generar una rutina personalizada y segura.</p>
              <div className="pf-grid">
                <div className="pf-field pf-field--full">
                  <label>Objetivo principal</label>
                  <div className="pf-opts pf-opts--2">
                    {[["lose_fat","Perder grasa","🔥"],["gain_muscle","Ganar músculo","💪"],["general_fitness","Estar activo","⚡"],["strength","Ganar fuerza","🏋️"]].map(([v,l,icon]) => (
                      <button key={v} type="button" className={`pf-opt pf-opt--tall${goal===v?" pf-opt--on":""}`} onClick={() => setGoal(v)}>
                        <span className="pf-opt-icon">{icon}</span><span className="pf-opt-title">{l}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="pf-field">
                  <label>Días por semana</label>
                  <div className="pf-days">
                    {[2,3,4,5,6].map(d => (
                      <button key={d} type="button" className={`pf-day${daysPerWeek===String(d)?" pf-day--on":""}`} onClick={() => setDaysPerWeek(String(d))}>{d}</button>
                    ))}
                  </div>
                </div>
                <div className="pf-field">
                  <label>Tiempo por sesión</label>
                  <select value={timePerSession} onChange={e => setTimePerSession(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    <option value="30">30 minutos</option>
                    <option value="45">45 minutos</option>
                    <option value="60">60 minutos</option>
                    <option value="75">75 minutos</option>
                    <option value="90">90 minutos</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="pf-nav">
            {step > 0 && (
              <button className="pf-btn pf-btn--sec" onClick={back} disabled={saving}>← Atrás</button>
            )}
            {step < steps.length - 1 ? (
              <button className="pf-btn" onClick={next}>Continuar →</button>
            ) : (
              <button className="pf-btn" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="ts-spin" /> Guardando...</> : isEdit ? "Guardar cambios ✓" : "Guardar perfil ✓"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ── Componente principal ──────────────────────────────── */
export default function Profile() {
  const user = auth.currentUser;
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    getDoc(doc(db, "profiles", user.uid)).then(snap => {
      if (snap.exists() && snap.data()?.completed) {
        setProfile(snap.data() as ProfileData);
      }
    }).finally(() => setLoading(false));
  }, [user]);

  if (loading) return <div className="ts-loading"><span className="ts-spin" /></div>;

  if (!profile)  return <ProfileForm existing={null} onSaved={p => { setProfile(p); setEditing(false); }} />;
  if (editing)   return <ProfileForm existing={profile} onSaved={p => { setProfile(p); setEditing(false); }} onCancel={() => setEditing(false)} />;
  return <ProfileSummary profile={profile} onEdit={() => setEditing(true)} />;
}