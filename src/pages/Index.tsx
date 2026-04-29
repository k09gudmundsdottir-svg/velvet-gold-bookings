import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Apple,
  Baby,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Cookie,
  Droplets,
  Ear,
  FileHeart,
  FileText,
  HeartPulse,
  Hospital,
  Info,
  Mail,
  MapPin,
  Menu,
  Microscope,
  Phone,
  Pill,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Syringe,
  UserRound,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/ordination-hero.jpg";
import doctorPortrait from "@/assets/doctor-portrait.jpg";

type Notice = { id: string; title: string; body: string; notice_type: string; starts_on: string | null; ends_on: string | null };
type BlogPost = { id: string; title: string; slug: string; category: string; excerpt: string; content: string; published_at: string | null };
type WeekendDuty = { id: string; duty_date: string; start_time: string; end_time: string; note: string | null };

const db = supabase as any;
const practiceName = "Dr. Alina Thordarson";
const practiceSubtitle = "Ärztin für Allgemeinmedizin";
const practiceAddress = "Quellenstraße 18–20, 2763 Neusiedl";
const practicePhone = "02632/73177";
const practiceEmail = "ordination@dralinathordarson.at";
const phoneHref = `tel:${practicePhone.replace(/\D/g, "")}`;

const navLinks = [
  ["Leistungen", "#leistungen"],
  ["Termine", "#termin"],
  ["Rezepte", "#rezepte"],
  ["Team", "#team"],
  ["Aktuelles", "#aktuelles"],
  ["Kontakt", "#kontakt"],
];

const openingHours = [
  ["Montag", "08:00 – 12:00"],
  ["Dienstag", "08:00 – 12:00"],
  ["Mittwoch", "16:00 – 18:00"],
  ["Donnerstag", "08:00 – 12:00"],
  ["Freitag", "geschlossen"],
];

const services = [
  [HeartPulse, "Vorsorgeuntersuchungen", "Jährliche Gesundenuntersuchung, Risikoabklärung und persönliche Präventionsplanung."],
  [Sparkles, "Vitamin C Therapie", "Infusionsgestützte Begleitung nach ärztlicher Abklärung und individueller Indikation."],
  [FileHeart, "Wundversorgung & Nähte", "Versorgung kleiner Verletzungen, Verbandswechsel, Nahtentfernung und Verlaufskontrollen."],
  [ClipboardCheck, "OP-Freigabe", "Präoperative Abklärung inklusive Basisdiagnostik und strukturierter Befundbesprechung."],
  [Baby, "Mutter-Kind-Pass", "Sorgfältige Begleitung wichtiger Vorsorge- und Kontrolltermine für Familien."],
  [Microscope, "Labor", "Blutabnahmen, Laborverlauf und verständliche Einordnung Ihrer Werte."],
  [Droplets, "Infusionen", "Medizinisch indizierte Infusionstherapien in ruhiger Ordinationsatmosphäre."],
  [Activity, "EKG", "Herzdiagnostik bei Beschwerden, Kontrollen und präoperativer Abklärung."],
  [Syringe, "Impfberatung", "Impfpass-Check, Auffrischungen, saisonale Empfehlungen und Reiseimpfberatung."],
  [Ear, "Ohrspülung", "Schonende Behandlung bei Ohrenschmalz nach ärztlicher Untersuchung."],
  [Apple, "Ernährungsberatung", "Alltagstaugliche Beratung bei Prävention, Gewicht, Stoffwechsel und Wohlbefinden."],
];

const weekendFallback: WeekendDuty[] = [
  { id: "wd-1", duty_date: "2026-04-26", start_time: "08:00", end_time: "14:00", note: "Wochenenddienst in der Ordination" },
  { id: "wd-2", duty_date: "2026-05-31", start_time: "08:00", end_time: "14:00", note: "Wochenenddienst in der Ordination" },
  { id: "wd-3", duty_date: "2026-06-21", start_time: "08:00", end_time: "14:00", note: "Wochenenddienst in der Ordination" },
];

const appointmentSchema = z.object({
  patient_name: z.string().trim().min(2).max(120),
  date_of_birth: z.string().min(1),
  insurance_type: z.enum(["Kasse", "Privat"]),
  reason: z.string().trim().min(5).max(1500),
  preferred_date: z.string().min(1),
  preferred_time: z.string().trim().min(2).max(40),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(40),
});

const medicationSchema = z.object({
  patient_name: z.string().trim().min(2).max(120),
  date_of_birth: z.string().min(1),
  medication_name: z.string().trim().min(2).max(160),
  dosage: z.string().trim().min(1).max(120),
  last_prescription_date: z.string().optional(),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().max(40).optional(),
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(255),
  message: z.string().trim().min(10).max(2000),
  consent: z.literal(true),
});

const isOpenNow = () => {
  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  if ([1, 2, 4].includes(day)) return minutes >= 8 * 60 && minutes < 12 * 60;
  if (day === 3) return minutes >= 16 * 60 && minutes < 18 * 60;
  return false;
};

const formatDate = (value: string) => new Intl.DateTimeFormat("de-AT", { weekday: "short", day: "2-digit", month: "2-digit" }).format(new Date(`${value}T12:00:00`));
const formatTime = (value: string) => value.slice(0, 5);

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cookieVisible, setCookieVisible] = useState(() => localStorage.getItem("medical-cookie-consent") !== "accepted");
  const [appointmentStep, setAppointmentStep] = useState(1);
  const [isSubmittingAppointment, setIsSubmittingAppointment] = useState(false);
  const [isSubmittingMedication, setIsSubmittingMedication] = useState(false);
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [weekendDuties, setWeekendDuties] = useState<WeekendDuty[]>(weekendFallback);
  const [appointment, setAppointment] = useState({ patient_name: "", date_of_birth: "", insurance_type: "Kasse", reason: "", preferred_date: "", preferred_time: "", email: "", phone: "" });
  const [medication, setMedication] = useState({ patient_name: "", date_of_birth: "", medication_name: "", dosage: "", last_prescription_date: "", email: "", phone: "" });
  const [contact, setContact] = useState({ name: "", phone: "", email: "", message: "", consent: false });
  const openNow = isOpenNow();
  const prescriptionLaunch = useMemo(() => new Date("2026-05-01T00:00:00"), []);
  const medicationLive = new Date() >= prescriptionLaunch;

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal-on-scroll"));
    if (reduceMotion) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -60px 0px" });
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const loadContent = async () => {
      const [{ data: noticeData }, { data: blogData }, { data: dutyData }] = await Promise.all([
        db.from("practice_notices").select("id,title,body,notice_type,starts_on,ends_on").eq("is_active", true).order("created_at", { ascending: false }).limit(4),
        db.from("blog_posts").select("id,title,slug,category,excerpt,content,published_at").eq("is_published", true).order("published_at", { ascending: false }).limit(3),
        db.from("weekend_duties").select("id,duty_date,start_time,end_time,note").eq("is_active", true).gte("duty_date", "2026-04-01").order("duty_date").limit(6),
      ]);
      setNotices(noticeData ?? []);
      setBlogPosts(blogData ?? []);
      if (dutyData?.length) setWeekendDuties(dutyData);
    };
    loadContent();
  }, []);

  const submitAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = appointmentSchema.safeParse(appointment);
    if (!parsed.success) {
      toast.error("Bitte füllen Sie alle Terminfelder korrekt aus.");
      return;
    }
    setIsSubmittingAppointment(true);
    const { error } = await db.from("medical_appointment_requests").insert({ ...parsed.data, status: "received" });
    setIsSubmittingAppointment(false);
    if (error) {
      toast.error("Ihre Terminanfrage konnte nicht gespeichert werden. Bitte rufen Sie die Ordination an.");
      return;
    }
    toast.success("Ihre Terminanfrage wurde übermittelt. Die Ordination meldet sich zur Bestätigung.");
    setAppointment({ patient_name: "", date_of_birth: "", insurance_type: "Kasse", reason: "", preferred_date: "", preferred_time: "", email: "", phone: "" });
    setAppointmentStep(1);
  };

  const submitMedication = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = medicationSchema.safeParse(medication);
    if (!parsed.success) {
      toast.error("Bitte prüfen Sie Ihre Medikamentenangaben.");
      return;
    }
    setIsSubmittingMedication(true);
    const { error } = await db.from("medication_requests").insert({ ...parsed.data, last_prescription_date: parsed.data.last_prescription_date || null, status: "received" });
    setIsSubmittingMedication(false);
    if (error) {
      toast.error("Die Medikamentenanfrage konnte nicht gespeichert werden.");
      return;
    }
    toast.success("Anfrage erhalten — der Status ist im Patientenportal einsehbar.");
    setMedication({ patient_name: "", date_of_birth: "", medication_name: "", dosage: "", last_prescription_date: "", email: "", phone: "" });
  };

  const submitContact = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) {
      toast.error("Bitte geben Sie gültige Kontaktdaten ein und stimmen Sie der Verarbeitung zu.");
      return;
    }
    setIsSubmittingContact(true);
    const { error } = await db.from("contact_messages").insert({ name: parsed.data.name, email: parsed.data.email, phone: parsed.data.phone, message: parsed.data.message });
    setIsSubmittingContact(false);
    if (error) {
      toast.error("Nachricht konnte nicht gesendet werden. Bitte rufen Sie die Ordination an.");
      return;
    }
    toast.success("Nachricht gesendet — die Ordination meldet sich bei Ihnen.");
    setContact({ name: "", phone: "", email: "", message: "", consent: false });
  };

  const acceptCookies = () => {
    localStorage.setItem("medical-cookie-consent", "accepted");
    setCookieVisible(false);
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground"><AlertTriangle className="mr-2 inline size-4" />Notfall? Rufen Sie 112 an.</div>

      <nav className="sticky top-0 z-50 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#home" className="font-display text-lg font-bold text-primary md:text-xl">Dr. Thordarson</a>
          <div className="hidden items-center gap-6 text-sm font-medium text-muted-foreground lg:flex">
            {navLinks.map(([label, href]) => <a key={href} className="transition-colors hover:text-primary" href={href}>{label}</a>)}
            <Link className="transition-colors hover:text-primary" to="/portal">Portal</Link>
          </div>
          <div className="hidden items-center gap-3 md:flex"><Button variant="outline" size="sm" asChild><a href={phoneHref}><Phone /> Anrufen</a></Button><Button size="sm" asChild><a href="#termin">Termin anfragen</a></Button></div>
          <button type="button" aria-label="Menü öffnen" onClick={() => setMobileMenuOpen(true)} className="rounded-md border border-border p-2 text-primary lg:hidden"><Menu className="size-5" /></button>
        </div>
      </nav>

      <div className={`fixed inset-0 z-[60] bg-primary/20 backdrop-blur-sm transition-opacity lg:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`fixed right-0 top-0 z-[61] h-full w-[min(88vw,24rem)] border-l border-border bg-card p-6 shadow-elegant transition-transform duration-500 ease-out lg:hidden ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between"><span className="font-display text-2xl text-primary">Ordination</span><button type="button" aria-label="Menü schließen" onClick={() => setMobileMenuOpen(false)} className="rounded-md border border-border p-2"><X className="size-5" /></button></div>
        <div className="mt-10 grid gap-4">{navLinks.map(([label, href]) => <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="border-b border-border pb-3 text-lg font-semibold text-foreground">{label}</a>)}<Link to="/portal" onClick={() => setMobileMenuOpen(false)} className="border-b border-border pb-3 text-lg font-semibold text-foreground">Patientenportal</Link></div>
      </aside>

      <section id="home" className="relative overflow-hidden bg-secondary">
        <img src={heroImage} alt="Helle professionelle Ordination von Dr. Alina Thordarson" className="absolute inset-0 h-full w-full object-cover opacity-25" width={1600} height={1000} />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-5 py-20 md:py-28 lg:grid-cols-[1.08fr_0.92fr] lg:px-8">
          <div className="animate-fade-up self-center">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-4 py-2 text-sm font-semibold text-primary"><ShieldCheck className="size-4" /> Alle Kassen und Privat</p>
            <h1 className="font-display text-5xl font-bold leading-tight text-foreground md:text-7xl">Dr. Alina Thordarson</h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-muted-foreground">Ärztin für Allgemeinmedizin in Neusiedl/Pernitz — moderne Hausarztmedizin mit Ruhe, Sorgfalt und klaren Abläufen.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Button size="xl" asChild><a href="#termin"><CalendarDays /> Termin anfragen</a></Button><Button variant="outline" size="xl" asChild><a href={phoneHref}><Phone /> {practicePhone}</a></Button></div>
          </div>
          <div className="animate-fade-up grid content-end gap-4 [animation-delay:160ms]">
            <div className="rounded-lg border border-border bg-card/90 p-6 shadow-elegant backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold uppercase text-muted-foreground">Aktueller Status</span><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${openNow ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}><span className="size-2 rounded-full bg-current" /> {openNow ? "Jetzt geöffnet" : "Geschlossen"}</span></div>
              <p className="mt-5 font-display text-3xl font-bold">Mo, Di, Do 08:00–12:00</p>
              <p className="mt-2 text-muted-foreground">Mi 16:00–18:00 · Fr geschlossen</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {["Alle Kassen", "Privat", "Seit 2020"].map((item) => <div key={item} className="rounded-lg border border-border bg-card/90 p-4 shadow-card"><p className="font-semibold text-primary">{item}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="aktuelles" className="reveal-on-scroll py-16">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="section-kicker">Aktuelles</p><h2 className="section-title">Hinweise aus der Ordination.</h2></div><Link to="/admin" className="text-sm font-semibold text-primary">Adminbereich</Link></div>
          <div className="grid gap-4 md:grid-cols-3">{(notices.length ? notices : [{ id: "n1", title: "Ordinationszeiten", body: "Mo 08–12, Di 08–12, Mi 16–18, Do 08–12, Fr geschlossen.", notice_type: "info", starts_on: null, ends_on: null }]).map((item) => <article key={item.id} className="rounded-lg border border-border bg-card p-6 shadow-card"><Info className="mb-4 size-6 text-primary" /><h3 className="font-display text-2xl font-bold">{item.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.body}</p></article>)}</div>
        </div>
      </section>

      <section id="termin" className="reveal-on-scroll bg-section py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
          <div><p className="section-kicker">Termin anfragen</p><h2 className="section-title">Online-Anfrage in drei Schritten.</h2><p className="section-copy mt-5">Ihre Anfrage wird gespeichert und vom Ordinationsteam bestätigt, abgelehnt oder umterminiert. Bei akuten Beschwerden bitte telefonisch melden.</p><div className="mt-8 grid gap-3">{["Patientendaten", "Anliegen & Wunschtermin", "Kontakt & Absenden"].map((label, index) => <button key={label} type="button" onClick={() => setAppointmentStep(index + 1)} className={`flex items-center gap-3 rounded-lg border p-4 text-left transition ${appointmentStep === index + 1 ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground"}`}><span className="grid size-8 place-items-center rounded-full bg-secondary font-semibold">{index + 1}</span>{label}</button>)}</div></div>
          <form onSubmit={submitAppointment} className="rounded-lg border border-border bg-card p-6 shadow-elegant md:p-8">
            {appointmentStep === 1 && <div className="grid gap-4 md:grid-cols-2"><Input aria-label="Name" placeholder="Vor- und Nachname" value={appointment.patient_name} onChange={(e) => setAppointment({ ...appointment, patient_name: e.target.value })} /><Input aria-label="Geburtsdatum" type="date" value={appointment.date_of_birth} onChange={(e) => setAppointment({ ...appointment, date_of_birth: e.target.value })} /><select aria-label="Versicherung" className="field-control rounded-md md:col-span-2" value={appointment.insurance_type} onChange={(e) => setAppointment({ ...appointment, insurance_type: e.target.value })}><option>Kasse</option><option>Privat</option></select><Button type="button" className="md:col-span-2" onClick={() => setAppointmentStep(2)}>Weiter</Button></div>}
            {appointmentStep === 2 && <div className="grid gap-4 md:grid-cols-2"><Textarea placeholder="Grund des Besuchs" className="min-h-32 md:col-span-2" value={appointment.reason} onChange={(e) => setAppointment({ ...appointment, reason: e.target.value })} /><Input aria-label="Wunschdatum" type="date" value={appointment.preferred_date} onChange={(e) => setAppointment({ ...appointment, preferred_date: e.target.value })} /><Input aria-label="Wunschzeit" placeholder="z.B. Vormittag, 10:30" value={appointment.preferred_time} onChange={(e) => setAppointment({ ...appointment, preferred_time: e.target.value })} /><Button type="button" variant="outline" onClick={() => setAppointmentStep(1)}>Zurück</Button><Button type="button" onClick={() => setAppointmentStep(3)}>Weiter</Button></div>}
            {appointmentStep === 3 && <div className="grid gap-4 md:grid-cols-2"><Input aria-label="E-Mail" type="email" placeholder="E-Mail" value={appointment.email} onChange={(e) => setAppointment({ ...appointment, email: e.target.value })} /><Input aria-label="Telefon" placeholder="Telefon" value={appointment.phone} onChange={(e) => setAppointment({ ...appointment, phone: e.target.value })} /><p className="text-sm leading-6 text-muted-foreground md:col-span-2">Mit dem Absenden stimmen Sie der Verarbeitung Ihrer Angaben zur Bearbeitung der Terminanfrage zu.</p><Button type="button" variant="outline" onClick={() => setAppointmentStep(2)}>Zurück</Button><Button type="submit" disabled={isSubmittingAppointment}>{isSubmittingAppointment ? "Wird gesendet…" : "Termin anfragen"}</Button></div>}
          </form>
        </div>
      </section>

      <section id="rezepte" className="reveal-on-scroll py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[1fr_1fr] lg:px-8">
          <div><p className="section-kicker">Medikamentenbestellung</p><h2 className="section-title">Dauermedikamente online anfragen.</h2><p className="section-copy mt-5">Start: 01.05.2026. Der Status läuft von „Anfrage erhalten“ über „In Bearbeitung“ bis „Bereit“ und ist im Patientenportal einsehbar.</p><div className="mt-8 grid gap-3">{["Anfrage erhalten", "In Bearbeitung", "Bereit"].map((step, index) => <div key={step} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4"><span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">{index + 1}</span><span className="font-semibold">{step}</span></div>)}</div>{!medicationLive && <p className="mt-5 rounded-lg border border-primary/30 bg-primary/10 p-4 text-sm text-primary">Diese Funktion startet offiziell am 01.05.2026.</p>}</div>
          <form onSubmit={submitMedication} className="rounded-lg border border-border bg-card p-6 shadow-card md:p-8"><div className="grid gap-4 md:grid-cols-2"><Input placeholder="Patientenname" value={medication.patient_name} onChange={(e) => setMedication({ ...medication, patient_name: e.target.value })} /><Input type="date" value={medication.date_of_birth} onChange={(e) => setMedication({ ...medication, date_of_birth: e.target.value })} /><Input placeholder="Medikament" value={medication.medication_name} onChange={(e) => setMedication({ ...medication, medication_name: e.target.value })} /><Input placeholder="Dosierung" value={medication.dosage} onChange={(e) => setMedication({ ...medication, dosage: e.target.value })} /><Input type="date" value={medication.last_prescription_date} onChange={(e) => setMedication({ ...medication, last_prescription_date: e.target.value })} /><Input placeholder="Telefon optional" value={medication.phone} onChange={(e) => setMedication({ ...medication, phone: e.target.value })} /><Input className="md:col-span-2" type="email" placeholder="E-Mail" value={medication.email} onChange={(e) => setMedication({ ...medication, email: e.target.value })} /></div><Button className="mt-5" type="submit" disabled={isSubmittingMedication}>{isSubmittingMedication ? "Wird gesendet…" : "Medikament anfragen"}</Button></form>
        </div>
      </section>

      <section id="leistungen" className="reveal-on-scroll bg-section py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-10 max-w-3xl"><p className="section-kicker">Leistungen</p><h2 className="section-title">Allgemeinmedizin mit persönlicher Begleitung.</h2></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{services.map(([Icon, title, text]) => <article key={String(title)} className="rounded-lg border border-border bg-card p-6 shadow-card transition hover:-translate-y-1 hover:border-primary/50"><Icon className="mb-5 size-8 text-primary" /><h3 className="font-display text-2xl font-bold">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{String(text)}</p></article>)}</div></div></section>

      <section id="team" className="reveal-on-scroll py-20"><div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.72fr_1.28fr] lg:px-8"><div className="overflow-hidden rounded-lg border border-border bg-card shadow-card"><img src={doctorPortrait} alt="Dr. Alina Thordarson, Ärztin für Allgemeinmedizin" className="aspect-[4/5] w-full object-cover" loading="lazy" width={900} height={1100} /></div><div className="self-center"><p className="section-kicker">Über uns</p><h2 className="section-title">Erfahrung aus Österreich und Norwegen.</h2><p className="mt-6 text-lg leading-8 text-muted-foreground">Dr. Alina Thordarson studierte Medizin an der Universität Wien und promovierte 2007. Danach sammelte sie wertvolle klinische Erfahrung in Norwegen und vertiefte ihre medizinische Arbeit unter anderem mit Spezialisierung in der Psychiatrie.</p><p className="mt-4 text-lg leading-8 text-muted-foreground">Seit 2020 führt sie die Praxis in Neusiedl. Die Ordinationsassistenz unterstützt Patientinnen und Patienten am Empfang, bei organisatorischen Anliegen und in der strukturierten Vorbereitung des Besuchs.</p><div className="mt-8 grid gap-4 md:grid-cols-2"><div className="rounded-lg border border-border bg-card p-5"><UserRound className="mb-3 size-7 text-primary" /><p className="font-display text-2xl font-bold">Dr. Alina Thordarson</p><p className="mt-2 text-muted-foreground">Ärztin für Allgemeinmedizin</p></div><div className="rounded-lg border border-border bg-card p-5"><Hospital className="mb-3 size-7 text-primary" /><p className="font-display text-2xl font-bold">Ordinationsassistenz</p><p className="mt-2 text-muted-foreground">Empfang, Organisation und Patientenbetreuung</p></div></div></div></div></section>

      <section className="reveal-on-scroll bg-section py-20"><div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8"><div><p className="section-kicker">Wochenenddienst</p><h2 className="section-title">Nächste Dienste.</h2></div><div className="grid gap-4 md:grid-cols-3">{weekendDuties.map((duty) => <article key={duty.id} className="rounded-lg border border-border bg-card p-6 shadow-card"><CalendarCheck className="mb-4 size-7 text-primary" /><p className="font-display text-3xl font-bold">{formatDate(duty.duty_date)}</p><p className="mt-2 text-muted-foreground">{formatTime(duty.start_time)}–{formatTime(duty.end_time)}</p><p className="mt-3 text-sm text-muted-foreground">{duty.note}</p></article>)}</div></div></section>

      <section className="reveal-on-scroll py-20"><div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end"><div><p className="section-kicker">Gesundheitsinfo</p><h2 className="section-title">Wissen für Patientinnen und Patienten.</h2></div><span className="text-sm font-semibold text-primary">Kategorien: Vorsorge · Ernährung · Impfungen</span></div><div className="grid gap-5 md:grid-cols-3">{blogPosts.map((post) => <article key={post.id} className="rounded-lg border border-border bg-card p-6 shadow-card"><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{post.category}</span><h3 className="mt-5 font-display text-2xl font-bold">{post.title}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p><ChevronRight className="mt-6 size-5 text-primary" /></article>)}</div></div></section>

      <section id="kontakt" className="reveal-on-scroll bg-section py-20"><div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8"><div><p className="section-kicker">Kontakt & Standort</p><h2 className="section-title">So erreichen Sie die Ordination.</h2><div className="mt-8 grid gap-4 text-muted-foreground"><p><MapPin className="mr-3 inline size-5 text-primary" />{practiceAddress}</p><p><Phone className="mr-3 inline size-5 text-primary" />{practicePhone}</p><p><Mail className="mr-3 inline size-5 text-primary" />{practiceEmail}</p></div><Button className="mt-8" asChild><a href={phoneHref}><Phone /> Jetzt anrufen</a></Button><div className="mt-8 overflow-hidden rounded-lg border border-border bg-muted"><iframe title={`${practiceName} Karte`} src="https://maps.google.com/maps?q=Quellenstra%C3%9Fe%2018%202763%20Neusiedl%20Austria&t=&z=14&ie=UTF8&iwloc=&output=embed" className="h-80 w-full" loading="lazy" /></div></div><form onSubmit={submitContact} className="rounded-lg border border-border bg-card p-6 shadow-card md:p-8"><h3 className="font-display text-3xl font-bold">Kontaktformular</h3><p className="mt-2 text-sm text-muted-foreground">Dieses Formular ersetzt keine Notfallversorgung.</p><div className="mt-6 grid gap-4 md:grid-cols-2"><Input placeholder="Name" value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} /><Input placeholder="Telefon" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} /><Input type="email" placeholder="E-Mail" className="md:col-span-2" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} /></div><Textarea placeholder="Ihr Anliegen" className="mt-4 min-h-36" value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} /><label className="mt-4 flex gap-3 text-sm leading-6 text-muted-foreground"><input type="checkbox" checked={contact.consent} onChange={(e) => setContact({ ...contact, consent: e.target.checked })} /> Ich stimme zu, dass meine Angaben zur Bearbeitung meiner Anfrage verarbeitet werden.</label><Button className="mt-5" type="submit" disabled={isSubmittingContact}>{isSubmittingContact ? "Wird gesendet…" : "Nachricht senden"}</Button></form></div></section>

      <footer className="border-t border-border bg-card py-12"><div className="mx-auto grid max-w-7xl gap-8 px-5 text-sm text-muted-foreground md:grid-cols-4 lg:px-8"><div><Stethoscope className="mb-4 size-7 text-primary" /><p className="font-display text-xl font-bold text-foreground">{practiceName}</p><p>{practiceSubtitle}</p></div><div><p className="mb-3 font-semibold text-foreground">Ordination</p>{openingHours.map(([day, hours]) => <p key={day}>{day}: {hours}</p>)}</div><div><p className="mb-3 font-semibold text-foreground">Notrufnummern</p><p>Notruf: 112</p><p>Rettung: 144</p><p>Gesundheitsberatung: 1450</p></div><div><p className="mb-3 font-semibold text-foreground">Rechtliches</p><Link className="block hover:text-primary" to="/impressum">Impressum</Link><Link className="block hover:text-primary" to="/datenschutz">Datenschutz</Link><Link className="block hover:text-primary" to="/portal">Patientenportal</Link></div></div></footer>

      {cookieVisible && <div className="fixed inset-x-4 bottom-4 z-[70] mx-auto max-w-3xl rounded-lg border border-border bg-card p-5 shadow-elegant"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><p className="text-sm leading-6 text-muted-foreground"><Cookie className="mr-2 inline size-4 text-primary" />Wir verwenden notwendige Cookies für Sicherheit, Formularfunktionen und Ihre Einwilligung. Details finden Sie in der Datenschutzerklärung.</p><Button onClick={acceptCookies}>Verstanden</Button></div></div>}
    </main>
  );
};

export default Index;
