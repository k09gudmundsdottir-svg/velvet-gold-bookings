import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { CalendarDays, FileText, LogOut, Mail, Pill, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Appointment = { id: string; patient_name: string; preferred_date: string; preferred_time: string; reason: string; status: string; confirmed_start: string | null };
type Medication = { id: string; medication_name: string; dosage: string; status: string; created_at: string };
type Referral = { id: string; title: string; description: string | null; issued_at: string; file_url: string | null };
const db = supabase as any;
const loginSchema = z.object({ email: z.string().trim().email() });
const statusLabel: Record<string, string> = { received: "Anfrage erhalten", processing: "In Bearbeitung", ready: "Bereit", confirmed: "Bestätigt", rejected: "Abgelehnt", rescheduled: "Umgereiht" };

const Portal = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthReady(true); });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const loadPortal = async () => {
      if (!session?.user) return;
      const userId = session.user.id;
      const emailAddress = session.user.email ?? "";
      const [{ data: appointmentData }, { data: medicationData }, { data: referralData }] = await Promise.all([
        db.from("medical_appointment_requests").select("id,patient_name,preferred_date,preferred_time,reason,status,confirmed_start").or(`patient_user_id.eq.${userId},email.eq.${emailAddress}`).order("preferred_date", { ascending: true }),
        db.from("medication_requests").select("id,medication_name,dosage,status,created_at").or(`patient_user_id.eq.${userId},email.eq.${emailAddress}`).order("created_at", { ascending: false }),
        db.from("referral_letters").select("id,title,description,issued_at,file_url").eq("patient_user_id", userId).order("issued_at", { ascending: false }),
      ]);
      setAppointments(appointmentData ?? []);
      setMedications(medicationData ?? []);
      setReferrals(referralData ?? []);
    };
    loadPortal();
  }, [session]);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse({ email });
    if (!parsed.success) {
      toast.error("Bitte geben Sie eine gültige E-Mail-Adresse ein.");
      return;
    }
    const { error } = await supabase.auth.signInWithOtp({ email: parsed.data.email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
    if (error) {
      toast.error("Login-Link konnte nicht gesendet werden.");
      return;
    }
    setSent(true);
  };

  if (!authReady) return <main className="min-h-screen bg-background p-6 text-foreground">Portal wird geladen…</main>;

  if (!session) {
    return <main className="min-h-screen bg-section px-5 py-20 text-foreground"><section className="mx-auto max-w-md rounded-lg border border-border bg-card p-8 shadow-elegant"><ShieldCheck className="mb-5 size-10 text-primary" /><p className="section-kicker">Patientenportal</p><h1 className="font-display text-5xl font-bold">Sicherer E-Mail-Login.</h1><p className="mt-4 text-muted-foreground">Sie erhalten einen Login-Link per E-Mail, um Termine, Rezeptstatus und Überweisungen einzusehen.</p><form onSubmit={submitLogin} className="mt-8 grid gap-4"><Input type="email" placeholder="E-Mail-Adresse" value={email} onChange={(event) => setEmail(event.target.value)} /><Button type="submit"><Mail /> Login-Link senden</Button>{sent && <p className="text-sm text-primary">Bitte prüfen Sie Ihr E-Mail-Postfach.</p>}</form></section></main>;
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card px-5 py-5"><div className="mx-auto flex max-w-7xl items-center justify-between"><div><p className="section-kicker mb-1">Patientenportal</p><h1 className="font-display text-4xl font-bold">Ihre Übersicht</h1></div><Button variant="outline" onClick={() => supabase.auth.signOut()}><LogOut /> Abmelden</Button></div></header><section className="mx-auto grid max-w-7xl gap-6 px-5 py-10 lg:grid-cols-3"><article className="rounded-lg border border-border bg-card p-6 shadow-card lg:col-span-2"><CalendarDays className="mb-4 size-8 text-primary" /><h2 className="font-display text-3xl font-bold">Termine</h2><div className="mt-5 grid gap-3">{appointments.length ? appointments.map((item) => <div key={item.id} className="rounded-md border border-border bg-background p-4"><p className="font-semibold">{item.preferred_date} · {item.preferred_time}</p><p className="mt-1 text-sm text-muted-foreground">{item.reason}</p><span className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{statusLabel[item.status] ?? item.status}</span></div>) : <p className="text-muted-foreground">Keine aktuellen Terminanfragen gefunden.</p>}</div></article><article className="rounded-lg border border-border bg-card p-6 shadow-card"><Pill className="mb-4 size-8 text-primary" /><h2 className="font-display text-3xl font-bold">Medikamente</h2><div className="mt-5 grid gap-3">{medications.length ? medications.map((item) => <div key={item.id} className="rounded-md border border-border bg-background p-4"><p className="font-semibold">{item.medication_name}</p><p className="text-sm text-muted-foreground">{item.dosage}</p><span className="mt-3 inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{statusLabel[item.status] ?? item.status}</span></div>) : <p className="text-muted-foreground">Keine Medikamentenanfragen gefunden.</p>}</div></article><article className="rounded-lg border border-border bg-card p-6 shadow-card lg:col-span-3"><FileText className="mb-4 size-8 text-primary" /><h2 className="font-display text-3xl font-bold">Überweisungen & Dokumente</h2><div className="mt-5 grid gap-3 md:grid-cols-3">{referrals.length ? referrals.map((item) => <div key={item.id} className="rounded-md border border-border bg-background p-4"><p className="font-semibold">{item.title}</p><p className="text-sm text-muted-foreground">{item.description ?? "Dokument vorgemerkt"}</p><Button className="mt-4" variant="outline" size="sm" disabled={!item.file_url}>Ansehen</Button></div>) : <p className="text-muted-foreground">Noch keine Dokumente hinterlegt.</p>}</div></article></section></main>;
};
export default Portal;
