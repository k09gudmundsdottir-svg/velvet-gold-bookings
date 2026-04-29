import { useEffect, useState } from "react";
import {
  Activity,
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  HeartPulse,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Phone,
  ShieldCheck,
  Stethoscope,
  Syringe,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/ordination-hero.jpg";
import doctorPortrait from "@/assets/doctor-portrait.jpg";

const practiceName = "Dr. Alina Thordarson";
const practiceSubtitle = "Ärztin für Allgemeinmedizin";
const practiceAddress = "Quellenstraße 18–20, 2763 Neusiedl";
const practicePhone = "02632/73177";
const practiceEmail = "ordination@dralinathordarson.at";
const whatsappHref = "https://wa.me/43263273177?text=Guten%20Tag%2C%20ich%20habe%20eine%20Frage%20zur%20Ordination.";

const navLinks = [
  ["Leistungen", "#leistungen"],
  ["Ordination", "#ordination"],
  ["Team", "#team"],
  ["Kontakt", "#kontakt"],
];

const openingHours = [
  ["Montag", "08:00 – 12:00"],
  ["Dienstag", "08:00 – 12:00"],
  ["Mittwoch", "16:00 – 18:00"],
  ["Donnerstag", "08:00 – 12:00"],
  ["Freitag", "keine Ordination"],
];

const services = [
  [HeartPulse, "Vorsorge-Untersuchungen", "Strukturierte Gesundenuntersuchungen mit persönlicher Beratung und klaren nächsten Schritten."],
  [ClipboardList, "Labor & Befunde", "Blutabnahmen, Befundbesprechungen und Verlaufskontrollen direkt in der Ordination."],
  [Activity, "EKG & OP-Freigaben", "Basisdiagnostik, internistische Einschätzung und Freigaben vor geplanten Eingriffen."],
  [Syringe, "Impfberatung", "Individuelle Impfpläne, Reiseberatung und saisonale Empfehlungen für Erwachsene und Familien."],
  [ShieldCheck, "Mutter-Kind-Pass", "Begleitung durch wichtige Vorsorge- und Kontrolltermine mit Ruhe und Sorgfalt."],
  [Stethoscope, "Wundversorgung", "Versorgung kleiner Verletzungen, Nähte, Verbandswechsel und Nachkontrollen."],
  [UserRound, "Ernährungsberatung", "Alltagstaugliche Beratung bei Prävention, Gewichtsmanagement und Stoffwechselthemen."],
  [FileText, "Medikamentenbestellung", "Ab 01.05.2026 können Dauermedikamente bequem über die Website vorbestellt werden."],
];

const updates = [
  { title: "Neue Ordinationszeiten ab 01.01.2026", text: "Montag, Dienstag und Donnerstag 08:00–12:00, Mittwoch 16:00–18:00, Freitag keine Ordination." },
  { title: "Medikamente online bestellen", text: "Ab 01.05.2026 wird eine digitale Vorbestellung für Dauermedikamente über diese Website möglich sein." },
  { title: "Wochenenddienst", text: "Nächste Dienste: Sonntag 31.05.2026 und Sonntag 21.06.2026 jeweils 08:00–14:00." },
];

const requestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(40),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
});

const isOpenNow = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 1 || day === 2 || day === 4) return hour >= 8 && hour < 12;
  if (day === 3) return hour >= 16 && hour < 18;
  return false;
};

const Index = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLoader, setShowLoader] = useState(() => !window.sessionStorage.getItem("ordination-loaded"));
  const [cursorPosition, setCursorPosition] = useState({ x: -120, y: -120 });
  const [contact, setContact] = useState({ name: "", phone: "", email: "", message: "" });
  const [isContacting, setIsContacting] = useState(false);
  const openNow = isOpenNow();

  useEffect(() => {
    if (!showLoader) return;
    const timer = window.setTimeout(() => {
      window.sessionStorage.setItem("ordination-loaded", "true");
      setShowLoader(false);
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [showLoader]);

  useEffect(() => {
    const updateCursor = (event: PointerEvent) => setCursorPosition({ x: event.clientX, y: event.clientY });
    window.addEventListener("pointermove", updateCursor);
    return () => window.removeEventListener("pointermove", updateCursor);
  }, []);

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

  const submitKontakt = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = requestSchema.safeParse(contact);
    if (!parsed.success) {
      toast.error("Bitte geben Sie gültige Kontaktdaten ein.");
      return;
    }
    setIsContacting(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email || `${parsed.data.phone.replace(/\s/g, "")}@telefon.local`,
      phone: parsed.data.phone,
      message: parsed.data.message,
    });
    setIsContacting(false);
    if (error) {
      toast.error("Nachricht konnte nicht gesendet werden. Bitte rufen Sie die Ordination an.");
      return;
    }
    toast.success("Anfrage gesendet — die Ordination meldet sich bei Ihnen.");
    setContact({ name: "", phone: "", email: "", message: "" });
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      {showLoader && <div className="fixed inset-0 z-[80] grid place-items-center bg-background"><div className="relative grid size-36 place-items-center border border-primary/35"><div className="absolute inset-3 animate-spin border border-primary/20 border-t-primary" /><Stethoscope className="size-10 text-primary" /><p className="absolute -bottom-10 font-display text-2xl tracking-[0.22em] text-primary">AT</p></div></div>}
      <div className="pointer-events-none fixed z-[70] hidden size-24 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/18 blur-2xl transition-transform duration-100 md:block" style={{ left: cursorPosition.x, top: cursorPosition.y }} />
      <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Nachricht schreiben" className="fixed bottom-5 right-5 z-50 flex size-14 items-center justify-center border border-primary bg-card text-primary shadow-elegant transition-all hover:-translate-y-1 hover:bg-primary hover:text-primary-foreground"><MessageCircle className="size-6" /></a>

      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#home" className="font-display text-lg uppercase tracking-[0.18em] text-primary md:text-xl">{practiceName}</a>
          <div className="hidden items-center gap-7 text-xs uppercase tracking-[0.22em] text-muted-foreground md:flex">
            {navLinks.map(([label, href]) => <a key={href} className="transition-colors hover:text-primary" href={href}>{label}</a>)}
          </div>
          <div className="hidden items-center gap-3 md:flex"><Button variant="glass" size="sm" asChild><a href={`tel:${practicePhone.replace(/\D/g, "")}`}><Phone /> Anrufen</a></Button><Button variant="hero" size="sm" asChild><a href="#kontakt">Termin anfragen</a></Button></div>
          <button type="button" aria-label="Menü öffnen" onClick={() => setMobileMenuOpen(true)} className="border border-primary/40 p-2 text-primary md:hidden"><Menu className="size-5" /></button>
        </div>
      </nav>

      <div className={`fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm transition-opacity md:hidden ${mobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={() => setMobileMenuOpen(false)} />
      <aside className={`fixed right-0 top-0 z-[61] h-full w-[min(84vw,22rem)] border-l border-primary/25 bg-card p-6 shadow-elegant transition-transform duration-500 ease-out md:hidden ${mobileMenuOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between"><span className="font-display text-2xl text-primary">Ordination</span><button type="button" aria-label="Menü schließen" onClick={() => setMobileMenuOpen(false)} className="border border-border p-2 text-foreground"><X className="size-5" /></button></div>
        <div className="mt-12 grid gap-5 text-lg text-muted-foreground">{navLinks.map(([label, href]) => <a key={href} href={href} onClick={() => setMobileMenuOpen(false)} className="border-b border-border pb-4 font-display text-3xl text-foreground transition-colors hover:text-primary">{label}</a>)}</div>
        <Button className="mt-10 w-full" variant="hero" size="xl" asChild><a href="#kontakt" onClick={() => setMobileMenuOpen(false)}>Termin anfragen</a></Button>
      </aside>

      <section id="home" className="relative flex min-h-screen items-center overflow-hidden pt-24">
        <img src={heroImage} alt="Helle und moderne Ordination von Dr. Alina Thordarson" className="absolute inset-0 h-full w-full object-cover" width={1600} height={1000} />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="hero-grain pointer-events-none absolute inset-0 opacity-35" />
        <div className="relative z-10 mx-auto grid max-w-7xl items-end gap-10 px-5 pb-14 pt-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
          <div className="animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-3 border border-primary/30 bg-card/55 px-4 py-2 text-xs uppercase tracking-[0.28em] text-primary backdrop-blur-md"><ShieldCheck className="size-4" /> Alle Kassen und Privat</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.95] text-foreground md:text-7xl lg:text-8xl">{practiceName}</h1>
            <p className="mt-5 max-w-2xl text-xl leading-8 text-foreground/90">{practiceSubtitle} in Neusiedl/Pernitz — persönliche Hausarztmedizin, klare Abläufe und eine Ordination, in der Patientinnen und Patienten gut ankommen.</p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Button variant="hero" size="xl" asChild><a href="#kontakt"><CalendarDays /> Termin anfragen</a></Button>
              <Button variant="glass" size="xl" asChild><a href={`tel:${practicePhone.replace(/\D/g, "")}`}><Phone /> {practicePhone}</a></Button>
            </div>
          </div>
          <div className="grid gap-4 animate-fade-up [animation-delay:180ms]">
            <div className="border border-primary/20 bg-card/75 p-5 shadow-card backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4"><span className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Heute</span><span className={`inline-flex items-center gap-2 text-sm ${openNow ? "text-success" : "text-destructive"}`}><span className="size-2 rounded-full bg-current" /> {openNow ? "Jetzt geöffnet" : "Geschlossen"}</span></div>
              <p className="mt-4 font-display text-3xl text-foreground">Mo, Di, Do 08:00–12:00</p>
              <p className="mt-2 text-sm text-muted-foreground">Mi 16:00–18:00 · Fr keine Ordination</p>
            </div>
            <div className="grid grid-cols-3 border border-border/70 bg-background/80 text-center backdrop-blur-xl">
              {[["Hausarzt", "Medizin"], ["Alle", "Kassen"], ["Seit", "2020"]].map(([metric, label]) => <div key={metric} className="border-r border-border/70 p-4 last:border-r-0"><p className="font-display text-2xl text-primary">{metric}</p><p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{label}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-on-scroll bg-section py-20">
        <div className="mx-auto grid max-w-7xl gap-5 px-5 md:grid-cols-3 lg:px-8">
          {updates.map((item) => <article key={item.title} className="border border-border bg-card p-6 shadow-card"><AlertCircle className="mb-4 size-7 text-primary" /><h2 className="font-display text-2xl text-foreground">{item.title}</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{item.text}</p></article>)}
        </div>
      </section>

      <section id="leistungen" className="reveal-on-scroll py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="section-kicker">Leistungen</p><h2 className="section-title">Hausärztliche Versorgung mit klarer Struktur.</h2></div><p className="section-copy md:max-w-md">Von Akutfällen bis Vorsorge: die wichtigsten Leistungen einer modernen Allgemeinmedizin an einem Ort.</p></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {services.map(([Icon, title, text]) => <article key={String(title)} className="border border-border bg-card p-6 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-card"><Icon className="mb-5 size-8 text-primary" /><h3 className="font-display text-2xl text-foreground">{String(title)}</h3><p className="mt-3 text-sm leading-6 text-muted-foreground">{String(text)}</p></article>)}
          </div>
        </div>
      </section>

      <section id="ordination" className="reveal-on-scroll bg-section py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div><p className="section-kicker">Ordination</p><h2 className="section-title">Freundlich, persönlich und gut organisiert.</h2><p className="section-copy mt-6">In der Landpraxis steht ein respektvoller Umgangston, ein offenes Ohr für Anliegen und eine angenehme Atmosphäre im Mittelpunkt. Wartezeiten werden so transparent und kurz wie möglich gehalten.</p><div className="mt-8 grid gap-3">{["Alle Kassen und Privat", "Barrierearme Abläufe", "Rezepte und Befunde koordiniert", "Rasche Orientierung bei akuten Beschwerden"].map((item) => <p key={item} className="flex items-center gap-3 text-muted-foreground"><CheckCircle2 className="size-5 text-primary" />{item}</p>)}</div></div>
          <div className="border border-primary/25 bg-card p-6 shadow-elegant"><div className="flex items-center gap-3"><Clock className="size-7 text-primary" /><h3 className="font-display text-3xl text-foreground">Ordinationszeiten</h3></div><div className="mt-6 grid gap-3">{openingHours.map(([day, hours]) => <div key={day} className="flex items-center justify-between border-b border-border pb-3 text-sm last:border-b-0"><span className="text-muted-foreground">{day}</span><span className="font-medium text-foreground">{hours}</span></div>)}</div><p className="mt-6 text-sm leading-6 text-muted-foreground">Bei Notfällen außerhalb der Öffnungszeiten wenden Sie sich bitte an 1450, den Ärztenotdienst oder in lebensbedrohlichen Situationen an 144.</p></div>
        </div>
      </section>

      <section id="team" className="reveal-on-scroll py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.72fr_1.28fr] lg:px-8">
          <div className="overflow-hidden border border-border bg-card shadow-card"><img src={doctorPortrait} alt="Dr. Alina Thordarson, Ärztin für Allgemeinmedizin" className="aspect-[4/5] w-full object-cover" loading="lazy" width={900} height={1100} /></div>
          <div className="self-center"><p className="section-kicker">Team</p><h2 className="section-title">Medizinische Erfahrung mit menschlicher Nähe.</h2><p className="mt-6 text-lg leading-8 text-muted-foreground">Dr. Alina Thordarson maturierte am BRG Marchettigasse in Wien, promovierte 2007 an der Universität Wien und sammelte klinische Erfahrung unter anderem in Norwegen sowie in der Allgemeinmedizin mit Teilspezialisierung Psychiatrie.</p><p className="mt-4 text-lg leading-8 text-muted-foreground">Seit 01.01.2020 führt sie die Ordination in Neusiedl/Pernitz. Unterstützt wird sie von einer Ordinationsassistenz, die Patientinnen und Patienten freundlich begleitet und Anliegen strukturiert aufnimmt.</p><div className="mt-8 grid gap-4 md:grid-cols-2"><div className="border border-border bg-card p-5"><p className="font-display text-2xl text-primary">Dr. Alina Thordarson</p><p className="mt-2 text-sm text-muted-foreground">Ärztin für Allgemeinmedizin</p></div><div className="border border-border bg-card p-5"><p className="font-display text-2xl text-primary">Ordinationsassistenz</p><p className="mt-2 text-sm text-muted-foreground">Empfang, Organisation und Patientenbetreuung</p></div></div></div>
        </div>
      </section>

      <section className="reveal-on-scroll bg-section py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><div className="mb-12 grid gap-6 md:grid-cols-2 md:items-end"><div><p className="section-kicker">Patientenservice</p><h2 className="section-title">Alles Wichtige vor Ihrem Besuch.</h2></div><p className="section-copy">Bitte bringen Sie e-card, aktuelle Medikamentenliste, relevante Befunde und — falls vorhanden — Impfpass oder Überweisung mit.</p></div><div className="grid gap-5 md:grid-cols-3">{[[FileText, "Rezepte", "Dauermedikamente rechtzeitig vorbestellen und nach Bestätigung abholen."], [CalendarDays, "Termine", "Für planbare Anliegen bitte vorab telefonisch oder über das Formular anfragen."], [AlertCircle, "Akutfälle", "Bei starken Beschwerden bitte anrufen, damit das Team die Dringlichkeit einschätzen kann."]].map(([Icon, title, text]) => <article key={String(title)} className="border border-border bg-card p-7 shadow-card"><Icon className="mb-6 size-8 text-primary" /><h3 className="font-display text-3xl text-foreground">{String(title)}</h3><p className="mt-3 text-muted-foreground">{String(text)}</p><ChevronRight className="mt-6 size-5 text-primary" /></article>)}</div></div>
      </section>

      <section id="kontakt" className="reveal-on-scroll py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div><p className="section-kicker">Kontakt & Standort</p><h2 className="section-title">So erreichen Sie die Ordination.</h2><div className="mt-8 grid gap-4 text-muted-foreground"><p><MapPin className="mr-3 inline size-5 text-primary" />{practiceAddress}</p><p><Phone className="mr-3 inline size-5 text-primary" />{practicePhone}</p><p><Mail className="mr-3 inline size-5 text-primary" />{practiceEmail}</p></div><div className="mt-8 overflow-hidden border border-border bg-muted"><iframe title={`${practiceName} Karte`} src="https://maps.google.com/maps?q=Quellenstra%C3%9Fe%2018%202763%20Neusiedl%20Austria&t=&z=14&ie=UTF8&iwloc=&output=embed" className="h-72 w-full grayscale" loading="lazy" /></div></div>
          <form onSubmit={submitKontakt} className="border border-border bg-card p-6 shadow-card md:p-8"><h3 className="font-display text-3xl text-foreground">Anfrage senden</h3><p className="mt-2 text-sm text-muted-foreground">Dieses Formular ersetzt keine Notfallversorgung. In dringenden Fällen bitte telefonisch melden.</p><div className="mt-6 grid gap-4 md:grid-cols-2"><Input placeholder="Name" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /><Input placeholder="Telefon" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /><Input type="email" placeholder="E-Mail optional" className="md:col-span-2" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /></div><Textarea placeholder="Ihr Anliegen" className="mt-4 min-h-36" value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} /><Button className="mt-5" variant="hero" type="submit" disabled={isContacting}>{isContacting ? "Wird gesendet…" : "Anfrage senden"}</Button></form>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground"><Stethoscope className="mx-auto mb-4 size-6 text-primary" />{practiceName} — {practiceSubtitle} · {practiceAddress}</footer>
    </main>
  );
};

export default Index;
