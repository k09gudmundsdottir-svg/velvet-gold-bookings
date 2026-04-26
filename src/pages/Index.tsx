import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  CalendarDays,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Gift,
  Mail,
  MapPin,
  Phone,
  Scissors,
  Sparkles,
  Star,
  TrendingUp,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/salon-hero.jpg";
import amaraImage from "@/assets/stylist-amara.jpg";
import leonImage from "@/assets/stylist-leon.jpg";
import sofiaImage from "@/assets/stylist-sofia.jpg";
import galleryMen from "@/assets/gallery-men.jpg";
import galleryColor from "@/assets/gallery-color.jpg";
import galleryTreatment from "@/assets/gallery-treatment.jpg";

type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  price_cents: number;
  duration_minutes: number;
};

type Stylist = {
  id: string;
  name: string;
  role: string;
  specialty: string;
  bio: string | null;
  years_experience: number;
};

type Testimonial = {
  customer_name: string;
  rating: number;
  quote: string;
  service_name: string | null;
};

type BookedSlot = {
  appointment_start: string;
  appointment_end: string;
};

const stylistImages: Record<string, string> = {
  "Amara Vale": amaraImage,
  "Leon Hart": leonImage,
  "Sofia Marin": sofiaImage,
};

const fallbackServices: Service[] = [
  { id: "cut-men", name: "Signature Cut & Finish", category: "Men", description: "Precision scissor cut, hot towel, neckline shave", price_cents: 5200, duration_minutes: 45 },
  { id: "beard", name: "Executive Beard Ritual", category: "Men", description: "Beard sculpting with oils and warm compress", price_cents: 3800, duration_minutes: 30 },
  { id: "cut-women", name: "Couture Cut & Blowout", category: "Women", description: "Shape, movement and polished finish", price_cents: 7800, duration_minutes: 75 },
  { id: "gloss", name: "Gloss Color Refresh", category: "Women", description: "Tonal gloss and shine treatment", price_cents: 9600, duration_minutes: 90 },
  { id: "kids", name: "Junior Trim", category: "Kids", description: "Gentle trim for younger guests", price_cents: 3200, duration_minutes: 30 },
  { id: "keratin", name: "Keratin Silk Treatment", category: "Treatments", description: "Smoothing ritual with mirror-like shine", price_cents: 18500, duration_minutes: 120 },
];

const fallbackStylists: Stylist[] = [
  { id: "amara", name: "Amara Vale", role: "Creative Director", specialty: "Precision cuts & editorial styling", bio: "Known for architectural shapes and soft, wearable luxury.", years_experience: 12 },
  { id: "leon", name: "Leon Hart", role: "Master Barber", specialty: "Classic barbering & beard rituals", bio: "A detail-obsessed barber blending heritage technique with modern finish.", years_experience: 9 },
  { id: "sofia", name: "Sofia Marin", role: "Color Specialist", specialty: "Balayage, gloss, dimensional color", bio: "Creates luminous color stories with a low-maintenance grow-out.", years_experience: 8 },
];

const fallbackTestimonials: Testimonial[] = [
  { customer_name: "Mira K.", rating: 5, quote: "The most refined salon experience I have had — calm, precise, and absolutely luxurious.", service_name: "Couture Cut" },
  { customer_name: "Daniel R.", rating: 5, quote: "Leon turned a routine cut into a ritual. Impeccable detail and atmosphere.", service_name: "Signature Cut" },
  { customer_name: "Elena S.", rating: 5, quote: "My color looks expensive, natural, and effortless. Already booked the next visit.", service_name: "Gloss Color" },
];

const bookingCategories = ["Men", "Women", "Treatments"];
const timeSlots = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00"];

const bookingSchema = z.object({
  customer_name: z.string().trim().min(2).max(120),
  customer_email: z.string().trim().email().max(255),
  customer_phone: z.string().trim().min(6).max(40).optional().or(z.literal("")),
  service_id: z.string().min(1),
  stylist_id: z.string().min(1),
  appointment_start: z.string().min(1),
  notes: z.string().trim().max(500).optional(),
});

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(6).max(40).optional().or(z.literal("")),
  message: z.string().trim().min(10).max(2000),
});

const newsletterSchema = z.object({ email: z.string().trim().email().max(255) });

const formatPrice = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(cents / 100);

const formatBookingDateTime = (value: string) => value ? format(new Date(value), "PPP 'at' HH:mm") : "Not selected";

const isOpenNow = () => {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  if (day === 0) return false;
  if (day === 6) return hour >= 10 && hour < 16;
  return hour >= 9 && hour < 20;
};

const Index = () => {
  const [services, setServices] = useState<Service[]>(fallbackServices);
  const [stylists, setStylists] = useState<Stylist[]>(fallbackStylists);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(fallbackTestimonials);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [beforeAfter, setBeforeAfter] = useState(52);
  const [bookingStep, setBookingStep] = useState(1);
  const [bookingCategory, setBookingCategory] = useState("Men");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState("");
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [booking, setBooking] = useState({ customer_name: "", customer_email: "", customer_phone: "", service_id: "", stylist_id: "", appointment_start: "", notes: "" });
  const [contact, setContact] = useState({ name: "", email: "", phone: "", message: "" });
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [isContacting, setIsContacting] = useState(false);
  const openNow = isOpenNow();

  useEffect(() => {
    const loadSalonData = async () => {
      const [{ data: serviceData }, { data: stylistData }, { data: testimonialData }] = await Promise.all([
        supabase.from("services").select("id,name,category,description,price_cents,duration_minutes").eq("is_active", true).order("sort_order"),
        supabase.from("stylists").select("id,name,role,specialty,bio,years_experience").eq("is_active", true).order("sort_order"),
        supabase.from("testimonials").select("customer_name,rating,quote,service_name").eq("is_featured", true).order("created_at", { ascending: false }),
      ]);
      if (serviceData?.length) setServices(serviceData);
      if (stylistData?.length) setStylists(stylistData);
      if (testimonialData?.length) setTestimonials(testimonialData);
    };
    loadSalonData();
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setActiveTestimonial((current) => (current + 1) % testimonials.length), 5200);
    return () => window.clearInterval(timer);
  }, [testimonials.length]);

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
  }, [services.length, stylists.length, testimonials.length]);

  const selectedService = services.find((service) => service.id === booking.service_id) ?? services[0];
  const selectedStylist = stylists.find((stylist) => stylist.id === booking.stylist_id);
  const serviceGroups = useMemo(() => ["Men", "Women", "Kids", "Treatments"].map((category) => ({ category, items: services.filter((service) => service.category === category) })), [services]);
  const filteredBookingServices = services.filter((service) => service.category === bookingCategory);
  const todayIso = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = bookingSchema.safeParse(booking);
    if (!parsed.success) {
      toast.error("Please complete the booking details.");
      return;
    }
    setIsBooking(true);
    const start = new Date(parsed.data.appointment_start);
    const duration = selectedService?.duration_minutes ?? 45;
    const end = new Date(start.getTime() + duration * 60 * 1000);
    const { error } = await supabase.from("appointments").insert({
      customer_name: parsed.data.customer_name,
      customer_email: parsed.data.customer_email,
      customer_phone: parsed.data.customer_phone || null,
      service_id: parsed.data.service_id,
      stylist_id: parsed.data.stylist_id,
      appointment_start: start.toISOString(),
      appointment_end: end.toISOString(),
      notes: parsed.data.notes || null,
    });
    setIsBooking(false);
    if (error) {
      toast.error("Booking could not be saved. Please try another time.");
      return;
    }
    toast.success("Appointment requested. Email confirmation is ready to connect.");
    setBooking({ customer_name: "", customer_email: "", customer_phone: "", service_id: "", stylist_id: "", appointment_start: "", notes: "" });
  };

  const submitContact = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = contactSchema.safeParse(contact);
    if (!parsed.success) {
      toast.error("Please enter valid contact details.");
      return;
    }
    setIsContacting(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      message: parsed.data.message,
    });
    setIsContacting(false);
    if (error) {
      toast.error("Message could not be sent.");
      return;
    }
    toast.success("Message sent — we will reply shortly.");
    setContact({ name: "", email: "", phone: "", message: "" });
  };

  const submitNewsletter = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = newsletterSchema.safeParse({ email: newsletterEmail });
    if (!parsed.success) {
      toast.error("Enter a valid email for your 10% code.");
      return;
    }
    const { error } = await supabase.from("newsletter_signups").insert({ email: parsed.data.email, consent: true });
    if (error) {
      toast.info("You may already have a FIRST10 code waiting.");
      return;
    }
    toast.success("Welcome — your FIRST10 code is reserved.");
    setNewsletterEmail("");
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <a href="#home" className="font-display text-xl uppercase tracking-[0.28em] text-primary">Maison Noir</a>
          <div className="hidden items-center gap-7 text-xs uppercase tracking-[0.22em] text-muted-foreground md:flex">
            <a className="transition-colors hover:text-primary" href="#services">Services</a>
            <a className="transition-colors hover:text-primary" href="#team">Stylists</a>
            <a className="transition-colors hover:text-primary" href="#gallery">Gallery</a>
            <a className="transition-colors hover:text-primary" href="#contact">Contact</a>
          </div>
          <Button variant="hero" size="sm" asChild><a href="#booking">Book Now</a></Button>
        </div>
      </nav>

      <section id="home" className="relative flex min-h-screen items-center overflow-hidden pt-24">
        <img src={heroImage} alt="Luxury barbershop and hair salon interior" className="absolute inset-0 h-full w-full object-cover" width={1600} height={1000} />
        <div className="absolute inset-0 bg-hero-overlay" />
        <div className="hero-grain pointer-events-none absolute inset-0 opacity-45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_var(--x,30%)_var(--y,40%),hsl(var(--primary)/0.22),transparent_28rem)] motion-safe:transition-[background]" onPointerMove={(event) => {
          const target = event.currentTarget as HTMLElement;
          target.style.setProperty("--x", `${event.clientX}px`);
          target.style.setProperty("--y", `${event.clientY}px`);
        }} />
        <div className="relative z-10 mx-auto grid max-w-7xl items-end gap-12 px-5 pb-16 pt-20 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
          <div className="animate-fade-up">
            <p className="mb-5 inline-flex items-center gap-3 border border-primary/30 bg-card/45 px-4 py-2 text-xs uppercase tracking-[0.32em] text-primary backdrop-blur-md"><Crown className="size-4" /> Private salon atelier</p>
            <h1 className="max-w-4xl font-display text-5xl leading-[0.95] text-foreground md:text-7xl lg:text-8xl">Precision grooming. Couture hair. Quiet luxury.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">A world-class barbershop and hair salon experience for guests who expect craft, discretion, and a flawless finish.</p>
            <div className="mt-9 flex flex-col gap-4 sm:flex-row">
              <Button variant="hero" size="xl" asChild><a href="#booking">Book Now <CalendarDays /></a></Button>
              <Button variant="glass" size="xl" asChild><a href="tel:+493012345678"><Phone /> Click to call</a></Button>
            </div>
          </div>
          <div className="grid gap-4 animate-fade-up [animation-delay:180ms]">
            <div className="border border-primary/20 bg-card/65 p-5 shadow-card backdrop-blur-xl">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm uppercase tracking-[0.25em] text-muted-foreground">Today</span>
                <span className={`inline-flex items-center gap-2 text-sm ${openNow ? "text-success" : "text-destructive"}`}><span className="size-2 rounded-full bg-current" /> {openNow ? "Open now" : "Closed"}</span>
              </div>
              <p className="mt-4 font-display text-3xl text-foreground">Mon–Fri 09:00–20:00</p>
              <p className="mt-2 text-sm text-muted-foreground">Saturday private appointments until 16:00</p>
            </div>
            <div className="grid grid-cols-3 border border-border/70 bg-background/75 text-center backdrop-blur-xl">
              {["4.9★", "18k+", "12 yrs"].map((metric, index) => <div key={metric} className="border-r border-border/70 p-4 last:border-r-0"><p className="font-display text-2xl text-primary">{metric}</p><p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">{["Rating", "Guests", "Craft"][index]}</p></div>)}
            </div>
          </div>
        </div>
      </section>

      <section id="booking" className="reveal-on-scroll bg-section py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
          <div>
            <p className="section-kicker">Online booking</p>
            <h2 className="section-title">Reserve your chair in minutes.</h2>
            <p className="section-copy">Choose a ritual, preferred stylist, and available time. Confirmation, reschedule, and cancellation flows are structured for email automation.</p>
            <div className="mt-8 grid gap-3">
              {services.slice(0, 3).map((service) => <button key={service.id} type="button" onClick={() => setBooking((current) => ({ ...current, service_id: service.id }))} className="group flex items-center justify-between border border-border bg-card p-4 text-left transition-all hover:border-primary/50 hover:bg-secondary">
                <span><span className="block font-display text-xl text-foreground">{service.name}</span><span className="text-sm text-muted-foreground">{service.duration_minutes} min</span></span>
                <span className="text-primary transition-transform group-hover:translate-x-1">{formatPrice(service.price_cents)}</span>
              </button>)}
            </div>
          </div>
          <form onSubmit={submitBooking} className="border border-primary/20 bg-card p-5 shadow-elegant md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              <Input placeholder="Full name" value={booking.customer_name} onChange={(event) => setBooking({ ...booking, customer_name: event.target.value })} />
              <Input placeholder="Email" type="email" value={booking.customer_email} onChange={(event) => setBooking({ ...booking, customer_email: event.target.value })} />
              <Input placeholder="Phone" value={booking.customer_phone} onChange={(event) => setBooking({ ...booking, customer_phone: event.target.value })} />
              <Input type="datetime-local" min={todayIso} value={booking.appointment_start} onChange={(event) => setBooking({ ...booking, appointment_start: event.target.value })} />
              <select aria-label="Select service" className="field-control" value={booking.service_id} onChange={(event) => setBooking({ ...booking, service_id: event.target.value })}>
                <option value="">Select service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name} · {formatPrice(service.price_cents)}</option>)}
              </select>
              <select aria-label="Select stylist" className="field-control" value={booking.stylist_id} onChange={(event) => setBooking({ ...booking, stylist_id: event.target.value })}>
                <option value="">Select stylist</option>{stylists.map((stylist) => <option key={stylist.id} value={stylist.id}>{stylist.name} · {stylist.specialty}</option>)}
              </select>
            </div>
            <Textarea className="mt-4 min-h-28" placeholder="Notes, allergies, preferred finish" value={booking.notes} onChange={(event) => setBooking({ ...booking, notes: event.target.value })} />
            <div className="mt-6 flex flex-col justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
              <p className="text-sm text-muted-foreground"><Clock className="mr-2 inline size-4 text-primary" />Real-time calendar foundation with secure appointment storage.</p>
              <Button variant="hero" size="lg" type="submit" disabled={isBooking}>{isBooking ? "Requesting…" : "Confirm appointment"}</Button>
            </div>
          </form>
        </div>
      </section>

      <section id="services" className="reveal-on-scroll py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="section-kicker">Services & pricing</p><h2 className="section-title">A curated menu of rituals.</h2></div><p className="section-copy md:max-w-md">Every service includes consultation, tailored product finish, and aftercare guidance.</p></div>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {serviceGroups.map((group) => <article key={group.category} className="border border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-primary/40 hover:shadow-card">
              <h3 className="mb-5 font-display text-3xl text-primary">{group.category}</h3>
              <div className="space-y-5">{group.items.map((service) => <div key={service.id} className="border-b border-border pb-4 last:border-b-0"><div className="flex justify-between gap-4"><p className="font-medium text-foreground">{service.name}</p><p className="text-primary">{formatPrice(service.price_cents)}</p></div><p className="mt-1 text-sm text-muted-foreground">{service.description}</p><p className="mt-2 text-xs uppercase tracking-[0.18em] text-accent-foreground">{service.duration_minutes} minutes</p></div>)}</div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="team" className="reveal-on-scroll bg-section py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <p className="section-kicker">Team</p><h2 className="section-title mb-12">Artists with a signature hand.</h2>
          <div className="grid gap-6 md:grid-cols-3">
            {stylists.map((stylist) => <article key={stylist.id} className="group overflow-hidden border border-border bg-card shadow-card">
              <div className="aspect-[3/4] overflow-hidden"><img src={stylistImages[stylist.name] ?? amaraImage} alt={`${stylist.name}, ${stylist.role}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" loading="lazy" width={768} height={1024} /></div>
              <div className="p-6"><p className="text-xs uppercase tracking-[0.25em] text-primary">{stylist.role}</p><h3 className="mt-2 font-display text-3xl text-foreground">{stylist.name}</h3><p className="mt-2 text-sm text-muted-foreground">{stylist.specialty}</p><p className="mt-4 text-sm leading-6 text-muted-foreground">{stylist.bio}</p><div className="mt-5 flex items-center justify-between"><span className="text-sm text-accent-foreground">{stylist.years_experience}+ years</span><Button variant="glass" size="sm" asChild><a href="#booking" onClick={() => setBooking((current) => ({ ...current, stylist_id: stylist.id }))}>Book</a></Button></div></div>
            </article>)}
          </div>
        </div>
      </section>

      <section id="gallery" className="reveal-on-scroll py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="mb-12 grid gap-6 md:grid-cols-2 md:items-end"><div><p className="section-kicker">Gallery</p><h2 className="section-title">Transformations in chiaroscuro.</h2></div><p className="section-copy">Masonry-inspired editorial work, with a tactile before/after reveal for transformation storytelling.</p></div>
          <div className="grid gap-5 md:grid-cols-[0.85fr_1.15fr]">
            <div className="grid gap-5"><img src={galleryMen} alt="Textured men's haircut" className="gallery-image aspect-square" loading="lazy" width={900} height={900} /><img src={galleryTreatment} alt="Glossy salon styling result" className="gallery-image aspect-[1.35/1]" loading="lazy" width={900} height={760} /></div>
            <div className="grid gap-5"><img src={galleryColor} alt="Champagne balayage color transformation" className="gallery-image aspect-[1.1/1]" loading="lazy" width={900} height={1100} />
              <div className="relative overflow-hidden border border-primary/30 bg-card">
                <img src={galleryMen} alt="Before haircut style" className="h-80 w-full object-cover grayscale" loading="lazy" width={900} height={900} />
                <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${beforeAfter}%` }}><img src={galleryColor} alt="After hair transformation" className="h-80 max-w-none object-cover" style={{ width: "min(85vw, 730px)" }} loading="lazy" width={900} height={1100} /></div>
                <div className="absolute inset-y-0 w-px bg-primary" style={{ left: `${beforeAfter}%` }} />
                <input aria-label="Before after slider" type="range" min="15" max="85" value={beforeAfter} onChange={(event) => setBeforeAfter(Number(event.target.value))} className="absolute inset-x-8 bottom-6 accent-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="reveal-on-scroll bg-section py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[1fr_0.8fr] lg:px-8">
          <div className="border border-border bg-card p-8 shadow-card md:p-12">
            <div className="mb-6 flex gap-1 text-primary">{Array.from({ length: testimonials[activeTestimonial]?.rating ?? 5 }).map((_, index) => <Star key={index} className="size-5 fill-current" />)}</div>
            <p className="font-display text-3xl leading-tight text-foreground md:text-5xl">“{testimonials[activeTestimonial]?.quote}”</p>
            <div className="mt-8 flex items-center justify-between"><div><p className="text-lg text-primary">{testimonials[activeTestimonial]?.customer_name}</p><p className="text-sm text-muted-foreground">{testimonials[activeTestimonial]?.service_name}</p></div><div className="flex gap-2"><Button variant="glass" size="icon" onClick={() => setActiveTestimonial((activeTestimonial - 1 + testimonials.length) % testimonials.length)}><ChevronLeft /></Button><Button variant="glass" size="icon" onClick={() => setActiveTestimonial((activeTestimonial + 1) % testimonials.length)}><ChevronRight /></Button></div></div>
          </div>
          <div className="grid gap-5">
            <div className="border border-primary/30 bg-card p-7"><Gift className="mb-4 size-8 text-primary" /><h3 className="font-display text-3xl">Gift cards</h3><p className="mt-3 text-muted-foreground">Luxury vouchers for birthdays, weddings, and private grooming rituals.</p></div>
            <div className="border border-border bg-card p-7"><Sparkles className="mb-4 size-8 text-primary" /><h3 className="font-display text-3xl">Loyalty atelier</h3><p className="mt-3 text-muted-foreground">Points tracker coming soon. Early members receive priority booking windows.</p></div>
          </div>
        </div>
      </section>

      <section id="contact" className="reveal-on-scroll py-24">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div><p className="section-kicker">Contact & location</p><h2 className="section-title">Visit the atelier.</h2><div className="mt-8 grid gap-4 text-muted-foreground"><p><MapPin className="mr-3 inline size-5 text-primary" />Königsallee 18, Düsseldorf</p><p><Phone className="mr-3 inline size-5 text-primary" />+49 30 1234 5678</p><p><Mail className="mr-3 inline size-5 text-primary" />concierge@maisonnoir.example</p></div>
            <div className="mt-8 overflow-hidden border border-border bg-muted"><iframe title="Maison Noir map" src="https://maps.google.com/maps?q=D%C3%BCsseldorf%20K%C3%B6nigsallee&t=&z=13&ie=UTF8&iwloc=&output=embed" className="h-72 w-full grayscale invert-[0.9]" loading="lazy" /></div>
          </div>
          <div className="grid gap-6">
            <form onSubmit={submitContact} className="border border-border bg-card p-6 shadow-card"><div className="grid gap-4 md:grid-cols-2"><Input placeholder="Name" value={contact.name} onChange={(event) => setContact({ ...contact, name: event.target.value })} /><Input type="email" placeholder="Email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} /><Input placeholder="Phone" className="md:col-span-2" value={contact.phone} onChange={(event) => setContact({ ...contact, phone: event.target.value })} /></div><Textarea placeholder="How can we help?" className="mt-4 min-h-32" value={contact.message} onChange={(event) => setContact({ ...contact, message: event.target.value })} /><Button className="mt-5" variant="hero" type="submit" disabled={isContacting}>{isContacting ? "Sending…" : "Send message"}</Button></form>
            <form onSubmit={submitNewsletter} className="border border-primary/30 bg-gold-gradient p-6 text-primary-foreground"><h3 className="font-display text-3xl">10% off your first visit</h3><p className="mt-2 text-primary-foreground/80">Join the newsletter for openings, care notes, and your FIRST10 incentive.</p><div className="mt-5 flex flex-col gap-3 sm:flex-row"><Input type="email" placeholder="Email address" value={newsletterEmail} onChange={(event) => setNewsletterEmail(event.target.value)} className="bg-primary-foreground/15 text-primary-foreground placeholder:text-primary-foreground/60" /><Button variant="velvet" type="submit">Claim code</Button></div></form>
          </div>
        </div>
      </section>

      <section className="reveal-on-scroll bg-section py-24">
        <div className="mx-auto max-w-7xl px-5 lg:px-8"><p className="section-kicker">Internal admin</p><h2 className="section-title mb-10">Operational command room.</h2><div className="grid gap-5 md:grid-cols-3">{[
          [CalendarDays, "Upcoming appointments", "24", "Confirm, reschedule, cancel"],
          [Users, "Customer list", "1,842", "Profiles and loyalty points"],
          [TrendingUp, "Revenue overview", "€8.7k", "Daily and weekly pulse"],
        ].map(([Icon, title, value, label]) => <div key={String(title)} className="border border-border bg-card p-7 shadow-card"><Icon className="mb-6 size-8 text-primary" /><p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">{String(title)}</p><p className="mt-2 font-display text-5xl text-foreground">{String(value)}</p><p className="mt-2 text-sm text-muted-foreground">{String(label)}</p></div>)}</div></div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground"><Scissors className="mx-auto mb-4 size-6 text-primary" />Maison Noir — premium barbershop & hair salon management experience.</footer>
    </main>
  );
};

export default Index;
