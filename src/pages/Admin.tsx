import { useEffect, useMemo, useState } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, startOfDay, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, Check, Clock, LogOut, Scissors, Shield, TrendingUp, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

type Appointment = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  appointment_start: string;
  appointment_end: string;
  service_id: string | null;
  stylist_id: string | null;
  status: string;
};

type Service = { id: string; name: string; price_cents: number; duration_minutes: number };
type Stylist = { id: string; name: string };

const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(6).max(128) });
const formatCurrency = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

const Admin = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [login, setLogin] = useState({ email: "", password: "" });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleValue, setRescheduleValue] = useState("");
  const [loading, setLoading] = useState(false);

  const serviceMap = useMemo(() => new Map(services.map((service) => [service.id, service])), [services]);
  const stylistMap = useMemo(() => new Map(stylists.map((stylist) => [stylist.id, stylist.name])), [stylists]);
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const todayAppointments = appointments.filter((appointment) => isSameDay(new Date(appointment.appointment_start), today)).sort((a, b) => +new Date(a.appointment_start) - +new Date(b.appointment_start));
  const weekAppointments = appointments.filter((appointment) => new Date(appointment.appointment_start) <= endOfWeek(today, { weekStartsOn: 1 }));
  const monthRevenue = appointments.filter((appointment) => appointment.status !== "cancelled").reduce((sum, appointment) => sum + (serviceMap.get(appointment.service_id ?? "")?.price_cents ?? 0), 0);
  const serviceStats = services.map((service) => ({ ...service, count: appointments.filter((appointment) => appointment.service_id === service.id && appointment.status !== "cancelled").length })).filter((service) => service.count > 0).sort((a, b) => b.count - a.count).slice(0, 5);
  const maxBooked = Math.max(1, ...serviceStats.map((service) => service.count));

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!session?.user.id) {
        setIsAdmin(false);
        return;
      }
      const { data } = await supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" });
      setIsAdmin(Boolean(data));
    };
    checkAdmin();
  }, [session]);

  const loadDashboard = async () => {
    setLoading(true);
    const monthStart = startOfMonth(today).toISOString();
    const monthEnd = endOfMonth(today).toISOString();
    const [{ data: appointmentData }, { data: serviceData }, { data: stylistData }] = await Promise.all([
      supabase.from("appointments").select("id,customer_name,customer_email,customer_phone,appointment_start,appointment_end,service_id,stylist_id,status").gte("appointment_start", monthStart).lte("appointment_start", monthEnd).order("appointment_start"),
      supabase.from("services").select("id,name,price_cents,duration_minutes"),
      supabase.from("stylists").select("id,name"),
    ]);
    setAppointments(appointmentData ?? []);
    setServices(serviceData ?? []);
    setStylists(stylistData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) loadDashboard();
  }, [isAdmin]);

  const submitLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = loginSchema.safeParse(login);
    if (!parsed.success) {
      toast.error("Enter a valid admin email and password.");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email ?? "", password: parsed.data.password ?? "" });
    if (error) toast.error(error.message);
  };

  const updateAppointmentStatus = async (id: string, status: "confirmed" | "cancelled") => {
    const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
    if (error) {
      toast.error("Appointment could not be updated.");
      return;
    }
    toast.success(`Appointment ${status}.`);
    loadDashboard();
  };

  const submitReschedule = async (appointment: Appointment) => {
    if (!rescheduleValue) return;
    const service = serviceMap.get(appointment.service_id ?? "");
    const start = new Date(rescheduleValue);
    const end = new Date(start.getTime() + (service?.duration_minutes ?? 45) * 60 * 1000);
    const { error } = await supabase.from("appointments").update({ appointment_start: start.toISOString(), appointment_end: end.toISOString(), status: "confirmed" }).eq("id", appointment.id);
    if (error) {
      toast.error("Selected time is unavailable.");
      return;
    }
    setRescheduleId(null);
    setRescheduleValue("");
    toast.success("Appointment rescheduled.");
    loadDashboard();
  };

  if (!authReady) return <main className="min-h-screen bg-background p-6 text-foreground">Loading admin…</main>;

  if (!session) {
    return <main className="min-h-screen bg-background px-5 py-20 text-foreground"><section className="mx-auto max-w-md border border-primary/25 bg-card p-8 shadow-elegant"><Shield className="mb-5 size-10 text-primary" /><p className="section-kicker">Admin access</p><h1 className="font-display text-5xl">Maison Noir command room.</h1><form onSubmit={submitLogin} className="mt-8 grid gap-4"><Input type="email" placeholder="Admin email" value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /><Input type="password" placeholder="Password" value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /><Button variant="hero" type="submit">Sign in</Button><Button variant="glass" type="button" onClick={() => lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/admin" })}>Continue with Google</Button></form></section></main>;
  }

  if (!isAdmin) {
    return <main className="min-h-screen bg-background px-5 py-20 text-foreground"><section className="mx-auto max-w-2xl border border-border bg-card p-8"><p className="section-kicker">Protected</p><h1 className="font-display text-5xl">Admin role required.</h1><p className="section-copy mt-4">You are signed in, but this account has not been granted admin access.</p><Button className="mt-8" variant="glass" onClick={() => supabase.auth.signOut()}>Sign out</Button></section></main>;
  }

  return <main className="min-h-screen bg-background text-foreground"><header className="border-b border-border bg-card/70 px-5 py-5 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><div><p className="section-kicker mb-1">Admin dashboard</p><h1 className="font-display text-4xl">Maison Noir operations</h1></div><Button variant="glass" onClick={() => supabase.auth.signOut()}><LogOut /> Sign out</Button></div></header><section className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-4"><article className="border border-primary/25 bg-card p-6 shadow-card"><TrendingUp className="mb-4 size-8 text-primary" /><p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Month revenue</p><p className="mt-2 font-display text-5xl text-foreground">{formatCurrency(monthRevenue)}</p></article><article className="border border-border bg-card p-6 shadow-card"><CalendarDays className="mb-4 size-8 text-primary" /><p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Today</p><p className="mt-2 font-display text-5xl text-foreground">{todayAppointments.length}</p></article><article className="border border-border bg-card p-6 shadow-card lg:col-span-2"><Scissors className="mb-4 size-8 text-primary" /><p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">Most booked services</p><div className="mt-4 grid gap-3">{serviceStats.length ? serviceStats.map((service) => <div key={service.id}><div className="mb-1 flex justify-between text-sm"><span>{service.name}</span><span className="text-primary">{service.count}</span></div><div className="h-2 bg-muted"><div className="h-full bg-primary" style={{ width: `${(service.count / maxBooked) * 100}%` }} /></div></div>) : <p className="text-sm text-muted-foreground">No service bookings this month yet.</p>}</div></article></section><section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 lg:grid-cols-[0.9fr_1.1fr]"><div className="border border-border bg-card p-6 shadow-card"><div className="mb-6 flex items-center justify-between"><h2 className="font-display text-3xl">Today's timeline</h2>{loading && <Badge variant="outline">Loading</Badge>}</div><div className="grid gap-4">{todayAppointments.length ? todayAppointments.map((appointment) => <article key={appointment.id} className="border-l-2 border-primary bg-background p-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div><p className="font-display text-2xl">{format(new Date(appointment.appointment_start), "HH:mm")} · {appointment.customer_name}</p><p className="text-sm text-muted-foreground">{serviceMap.get(appointment.service_id ?? "")?.name ?? "Service"} with {stylistMap.get(appointment.stylist_id ?? "") ?? "Stylist"}</p><Badge className="mt-3" variant={appointment.status === "cancelled" ? "destructive" : "secondary"}>{appointment.status}</Badge></div><div className="flex flex-wrap gap-2"><Button size="sm" variant="glass" onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}><Check /> Confirm</Button><Button size="sm" variant="glass" onClick={() => setRescheduleId(appointment.id)}><Clock /> Reschedule</Button><Button size="sm" variant="destructive" onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}><X /> Cancel</Button></div></div>{rescheduleId === appointment.id && <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row"><Input type="datetime-local" value={rescheduleValue} onChange={(event) => setRescheduleValue(event.target.value)} /><Button type="button" variant="hero" onClick={() => submitReschedule(appointment)}>Save time</Button></div>}</article>) : <p className="text-muted-foreground">No appointments today.</p>}</div></div><div className="border border-border bg-card p-6 shadow-card"><h2 className="mb-6 font-display text-3xl">Upcoming bookings this week</h2><div className="grid gap-3 md:grid-cols-7">{weekDays.map((day) => <div key={day.toISOString()} className="min-h-40 border border-border bg-background p-3"><p className="mb-3 font-display text-xl text-primary">{format(day, "EEE d")}</p><div className="grid gap-2">{weekAppointments.filter((appointment) => isSameDay(new Date(appointment.appointment_start), day)).map((appointment) => <div key={appointment.id} className="border border-border bg-card p-2 text-xs"><p className="font-medium text-foreground">{format(new Date(appointment.appointment_start), "HH:mm")} {appointment.customer_name}</p><p className="mt-1 text-muted-foreground">{serviceMap.get(appointment.service_id ?? "")?.name ?? "Service"}</p></div>)}</div></div>)}</div></div></section></main>;
};

export default Admin;