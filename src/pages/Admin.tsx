import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { format, isSameDay, startOfDay } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarDays, Check, FileText, LogOut, Newspaper, Pill, Shield, Users, X } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Appointment = { id: string; patient_name: string; date_of_birth: string; insurance_type: string; reason: string; preferred_date: string; preferred_time: string; email: string; phone: string; status: string; admin_notes: string | null; confirmed_start: string | null; created_at: string };
type Medication = { id: string; patient_name: string; medication_name: string; dosage: string; email: string; status: string; created_at: string; admin_notes: string | null };
type Notice = { id: string; title: string; body: string; notice_type: string; is_active: boolean };
type BlogPost = { id: string; title: string; category: string; excerpt: string; is_published: boolean };
type Profile = { id: string; full_name: string; email: string; phone: string | null; insurance_type: string };
const db = supabase as any;
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(6).max(128) });
const statusLabel: Record<string, string> = { received: "Eingelangt", confirmed: "Bestätigt", rejected: "Abgelehnt", rescheduled: "Umgereiht", processing: "In Bearbeitung", ready: "Bereit" };

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [patients, setPatients] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const today = startOfDay(new Date());
  const todaysAppointments = useMemo(() => appointments.filter((item) => isSameDay(new Date(`${item.preferred_date}T12:00:00`), today)), [appointments, today]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user.id) { setIsAdmin(false); return; }
      const { data, error } = await db.from("user_roles").select("role").eq("user_id", session.user.id).eq("role", "admin").maybeSingle();
      setIsAdmin(!error && Boolean(data));
    };
    checkAdmin();
  }, [session]);

  const loadDashboard = async () => {
    setLoading(true);
    const [{ data: appointmentData }, { data: medicationData }, { data: noticeData }, { data: blogData }, { data: patientData }] = await Promise.all([
      db.from("medical_appointment_requests").select("id,patient_name,date_of_birth,insurance_type,reason,preferred_date,preferred_time,email,phone,status,admin_notes,confirmed_start,created_at").order("created_at", { ascending: false }).limit(100),
      db.from("medication_requests").select("id,patient_name,medication_name,dosage,email,status,created_at,admin_notes").order("created_at", { ascending: false }).limit(100),
      db.from("practice_notices").select("id,title,body,notice_type,is_active").order("created_at", { ascending: false }).limit(50),
      db.from("blog_posts").select("id,title,category,excerpt,is_published").order("created_at", { ascending: false }).limit(50),
      db.from("profiles").select("id,full_name,email,phone,insurance_type").order("created_at", { ascending: false }).limit(100),
    ]);
    setAppointments(appointmentData ?? []);
    setMedications(medicationData ?? []);
    setNotices(noticeData ?? []);
    setBlogPosts(blogData ?? []);
    setPatients(patientData ?? []);
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) loadDashboard(); }, [isAdmin]);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse(login);
    if (!parsed.success) { toast.error("Bitte geben Sie gültige Zugangsdaten ein."); return; }
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
    if (error) toast.error("Anmeldung fehlgeschlagen.");
  };

  const updateAppointmentStatus = async (id: string, status: "confirmed" | "rejected" | "rescheduled") => {
    const { error } = await db.from("medical_appointment_requests").update({ status }).eq("id", id);
    if (error) { toast.error("Status konnte nicht aktualisiert werden."); return; }
    toast.success("Terminanfrage aktualisiert.");
    loadDashboard();
  };

  const updateMedicationStatus = async (id: string, status: "processing" | "ready" | "rejected") => {
    const { error } = await db.from("medication_requests").update({ status, ready_notified_at: status === "ready" ? new Date().toISOString() : null }).eq("id", id);
    if (error) { toast.error("Medikamentenstatus konnte nicht aktualisiert werden."); return; }
    toast.success(status === "ready" ? "Als bereit markiert." : "Status aktualisiert.");
    loadDashboard();
  };

  if (!authReady) return <main className="min-h-screen bg-background p-6 text-foreground">Adminbereich wird geladen…</main>;

  if (!session) {
    return <main className="min-h-screen bg-section px-5 py-20 text-foreground"><section className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 shadow-elegant"><Shield className="mb-5 size-10 text-primary" /><p className="section-kicker">Adminbereich</p><h1 className="font-display text-5xl font-bold">Ordination verwalten.</h1><form onSubmit={submitLogin} className="mt-8 grid gap-4"><Input type="email" placeholder="Admin-E-Mail" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /><Input type="password" placeholder="Passwort" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><Button type="submit">Anmelden</Button><Button variant="outline" type="button" onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/#/admin" })}>Mit Google fortfahren</Button></form></section></main>;
  }

  if (!isAdmin) {
    return <main className="min-h-screen bg-background px-5 py-20 text-foreground"><section className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8"><p className="section-kicker">Geschützt</p><h1 className="font-display text-5xl font-bold">Adminrolle erforderlich.</h1><p className="section-copy mt-4">Dieses Konto ist angemeldet, hat aber keine Adminberechtigung.</p><Button className="mt-8" variant="outline" onClick={() => supabase.auth.signOut()}>Abmelden</Button></section></main>;
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card px-5 py-5"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="section-kicker mb-1">Admin Dashboard</p><h1 className="font-display text-4xl font-bold">Dr. Alina Thordarson</h1></div><Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut /> Abmelden</Button></div></header><section className="mx-auto grid max-w-7xl gap-5 px-5 py-8 md:grid-cols-4"><article className="rounded-lg border border-border bg-card p-6 shadow-card"><CalendarDays className="mb-4 size-8 text-primary" /><p className="text-sm font-semibold uppercase text-muted-foreground">Heute</p><p className="mt-2 font-display text-5xl font-bold">{todaysAppointments.length}</p></article><article className="rounded-lg border border-border bg-card p-6 shadow-card"><Pill className="mb-4 size-8 text-primary" /><p className="text-sm font-semibold uppercase text-muted-foreground">Rezepte</p><p className="mt-2 font-display text-5xl font-bold">{medications.length}</p></article><article className="rounded-lg border border-border bg-card p-6 shadow-card"><Users className="mb-4 size-8 text-primary" /><p className="text-sm font-semibold uppercase text-muted-foreground">Patienten</p><p className="mt-2 font-display text-5xl font-bold">{patients.length}</p></article><article className="rounded-lg border border-border bg-card p-6 shadow-card"><Newspaper className="mb-4 size-8 text-primary" /><p className="text-sm font-semibold uppercase text-muted-foreground">Beiträge</p><p className="mt-2 font-display text-5xl font-bold">{blogPosts.length}</p></article></section><section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 xl:grid-cols-2"><Panel title="Terminanfragen" loading={loading}>{appointments.map((item) => <article key={item.id} className="rounded-md border border-border bg-background p-4"><div className="flex flex-col justify-between gap-3 md:flex-row"><div><p className="font-display text-2xl font-bold">{item.patient_name}</p><p className="text-sm text-muted-foreground">{item.preferred_date} · {item.preferred_time} · {item.insurance_type}</p><p className="mt-2 text-sm leading-6">{item.reason}</p><Badge className="mt-3" variant="secondary">{statusLabel[item.status] ?? item.status}</Badge></div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => updateAppointmentStatus(item.id, "confirmed")}><Check /> Bestätigen</Button><Button size="sm" variant="outline" onClick={() => updateAppointmentStatus(item.id, "rescheduled")}>Umdatieren</Button><Button size="sm" variant="destructive" onClick={() => updateAppointmentStatus(item.id, "rejected")}><X /> Ablehnen</Button></div></div></article>)}</Panel><Panel title="Medikamentenanfragen" loading={loading}>{medications.map((item) => <article key={item.id} className="rounded-md border border-border bg-background p-4"><p className="font-display text-2xl font-bold">{item.medication_name}</p><p className="text-sm text-muted-foreground">{item.patient_name} · {item.dosage}</p><Badge className="mt-3" variant="secondary">{statusLabel[item.status] ?? item.status}</Badge><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => updateMedicationStatus(item.id, "processing")}>In Bearbeitung</Button><Button size="sm" onClick={() => updateMedicationStatus(item.id, "ready")}>Bereit</Button><Button size="sm" variant="destructive" onClick={() => updateMedicationStatus(item.id, "rejected")}>Ablehnen</Button></div></article>)}</Panel><Panel title="Heutige Timeline" loading={loading}>{todaysAppointments.length ? todaysAppointments.map((item) => <div key={item.id} className="border-l-2 border-primary bg-background p-4"><p className="font-semibold">{item.preferred_time} · {item.patient_name}</p><p className="text-sm text-muted-foreground">{item.reason}</p></div>) : <p className="text-muted-foreground">Keine Termine für heute.</p>}</Panel><Panel title="Aktuelles & Blog" loading={loading}><div className="grid gap-5 md:grid-cols-2"><div><h3 className="mb-3 font-semibold">Aushänge</h3>{notices.map((item) => <div key={item.id} className="mb-3 rounded-md border border-border bg-background p-3"><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.body}</p></div>)}</div><div><h3 className="mb-3 font-semibold">Blog</h3>{blogPosts.map((item) => <div key={item.id} className="mb-3 rounded-md border border-border bg-background p-3"><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.category}</p></div>)}</div></div><NoticeQuickCreate onDone={loadDashboard} /><BlogQuickCreate onDone={loadDashboard} /></Panel><Panel title="Patientenliste" loading={loading}>{patients.length ? patients.map((item) => <div key={item.id} className="rounded-md border border-border bg-background p-4"><p className="font-semibold">{item.full_name}</p><p className="text-sm text-muted-foreground">{item.email} · {item.insurance_type}</p></div>) : <p className="text-muted-foreground">Noch keine Portalprofile.</p>}</Panel></section></main>;
};

const Panel = ({ title, loading, children }: { title: string; loading: boolean; children: React.ReactNode }) => <div className="rounded-lg border border-border bg-card p-6 shadow-card"><div className="mb-5 flex items-center justify-between"><h2 className="font-display text-3xl font-bold">{title}</h2>{loading && <Badge variant="outline">Lädt</Badge>}</div><div className="grid max-h-[34rem] gap-3 overflow-auto pr-1">{children}</div></div>;

const NoticeQuickCreate = ({ onDone }: { onDone: () => void }) => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 3 || body.trim().length < 5) return;
    const { error } = await db.from("practice_notices").insert({ title, body, notice_type: "info", is_active: true });
    if (error) { toast.error("Aushang konnte nicht erstellt werden."); return; }
    toast.success("Aushang veröffentlicht.");
    setTitle(""); setBody(""); onDone();
  };
  return <form onSubmit={submit} className="mt-4 rounded-md border border-border bg-background p-4"><div className="mb-3 flex items-center gap-2 font-semibold"><FileText className="size-4 text-primary" /> Neuer Aushang</div><Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} /><Textarea className="mt-3" placeholder="Nachricht" value={body} onChange={(e) => setBody(e.target.value)} /><Button className="mt-3" size="sm" type="submit">Veröffentlichen</Button></form>;
};

const BlogQuickCreate = ({ onDone }: { onDone: () => void }) => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Vorsorge");
  const [excerpt, setExcerpt] = useState("");
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (title.trim().length < 3 || excerpt.trim().length < 10) return;
    const slug = title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const { error } = await db.from("blog_posts").insert({ title, slug: `${slug}-${Date.now()}`, category, excerpt, content: excerpt, is_published: true, published_at: new Date().toISOString() });
    if (error) { toast.error("Artikel konnte nicht erstellt werden."); return; }
    toast.success("Artikel veröffentlicht.");
    setTitle(""); setExcerpt(""); onDone();
  };
  return <form onSubmit={submit} className="mt-4 rounded-md border border-border bg-background p-4"><div className="mb-3 flex items-center gap-2 font-semibold"><Newspaper className="size-4 text-primary" /> Neuer Blogartikel</div><Input placeholder="Titel" value={title} onChange={(e) => setTitle(e.target.value)} /><select className="field-control mt-3 rounded-md" value={category} onChange={(e) => setCategory(e.target.value)}><option>Vorsorge</option><option>Ernährung</option><option>Impfungen</option></select><Textarea className="mt-3" placeholder="Kurztext" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} /><Button className="mt-3" size="sm" type="submit">Artikel veröffentlichen</Button></form>;
};

export default Admin;
