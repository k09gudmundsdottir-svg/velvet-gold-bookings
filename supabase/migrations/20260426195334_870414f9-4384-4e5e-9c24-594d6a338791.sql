UPDATE public.services
SET is_active = false;

INSERT INTO public.services (name, category, description, duration_minutes, price_cents, sort_order, is_active)
VALUES
  ('Herrenhaarschnitt', 'Men', 'Klassischer Schnitt mit Styling und Konturen', 30, 2500, 1, true),
  ('Herrenhaarschnitt & Bart', 'Men', 'Haarschnitt, Bartform und Pflegefinish', 45, 3900, 2, true),
  ('Maschinenschnitt', 'Men', 'Präziser Kurzhaarschnitt mit Maschine', 20, 1800, 3, true),
  ('Damenhaarschnitt', 'Women', 'Beratung, Schnitt, Föhnen und Finish', 60, 4500, 4, true),
  ('Waschen & Föhnen', 'Women', 'Schonende Pflegewäsche und professionelles Styling', 35, 3200, 5, true),
  ('Färben ab', 'Women', 'Ansatz oder Farbauffrischung inklusive Beratung', 90, 6500, 6, true),
  ('Balayage ab', 'Women', 'Natürliche Farbverläufe mit Gloss-Finish', 150, 12000, 7, true),
  ('Intensivpflege Treatment', 'Treatments', 'Aufbauende Pflegekur mit Kopfmassage', 30, 2900, 8, true),
  ('Keratin Glättung ab', 'Treatments', 'Glättendes Premium-Treatment für seidigen Glanz', 120, 14500, 9, true)
ON CONFLICT DO NOTHING;

UPDATE public.stylists
SET is_active = false;

INSERT INTO public.stylists (name, role, specialty, bio, years_experience, sort_order, is_active)
VALUES
  ('Anna Berger', 'Master Stylistin', 'Damenhaarschnitte, Balayage und Farbberatung', 'Ruhige Präzision, typgerechte Beratung und elegante Looks für jeden Tag.', 11, 1, true),
  ('Lukas Steiner', 'Barber & Herrenstylist', 'Herrenhaarschnitte, Bartformen und Konturen', 'Klassisches Barber-Handwerk mit modernem Wiener Finish.', 8, 2, true),
  ('Mira Novak', 'Color Specialist', 'Färben, Glossing und Pflege-Treatments', 'Spezialistin für natürliche Farbverläufe, Glanz und gesunde Haarstruktur.', 9, 3, true)
ON CONFLICT DO NOTHING;

UPDATE public.testimonials
SET is_featured = false;

INSERT INTO public.testimonials (customer_name, rating, quote, service_name, is_featured)
VALUES
  ('Julia M.', 5, 'Wunderschöner Salon, ehrliche Beratung und mein Schnitt sitzt perfekt.', 'Damenhaarschnitt', true),
  ('Markus H.', 5, 'Sehr sauberer Herrenhaarschnitt und Bartservice — genau so muss es sein.', 'Herrenhaarschnitt & Bart', true),
  ('Elena K.', 5, 'Die Farbe wirkt natürlich, hochwertig und glänzt unglaublich schön.', 'Balayage', true)
ON CONFLICT DO NOTHING;