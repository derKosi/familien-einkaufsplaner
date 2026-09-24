---
doc: backlog
status: lebendig
---

# Ausbau-Roadmap (nach dem PoC) — bewusst nicht im aktuellen Build

Herkunft: Checkpoint-Feedback (24.09.2026). Lerner-Entscheidung: PoC zuerst fertig
stellen (Liste → Events → Onboarding → Feinschliff), diese Punkte danach einzeln
bewerten. Keiner davon ist „fallen gelassen" — sie sind geordnet.

## 1. Planungswerkbank für den Hauptkoch (größter Ausbau)
„Nicht bot macht alles und ich bekomme es vorgesetzt": Lune bekommt eine Ansicht mit
a) Vorrat im Haus (Pantry), b) geplanten aber ungekochten Resten (plan-bewusst),
c) konkreten Vorschlägen aus dem aktuellen Angebot — was kann man kochen, was kostet
es, kcal pro Portion — zum Zusammenklicken. Kosten: Datenmodell Pantry + Vorschlags-
Matching + neue Ansicht ≈ 2 Slices. Teilsamen existiert: Slice 6 liefert
Angebots-Vorschläge für Events; das Matching kann dann hierauf aufstocken.

## 2. Lieblingsgerichte
Personen-/Haushalts-Favoriten mit häufigerer Planung. Kosten: Person-Favoriten-Feld
+ Planner-Kontext + UI-Pin ≈ ½–1 Slice. Onboarding (Slice 7) kann das Feld gleich
mit erfragen.

## 3. Rezept-Tiefe
Zeiten (Vorbereitung/Gesamt), Reihenfolgen und Temperaturen über die aktuellen
2–4 Kurzschritte hinaus. Kosten: Content-Pass über 24 Rezepte ≈ 1 Stunde; leichte
Variante (Zeitangabe + 1–2 Sätze mehr pro Rezept) ist auch schon mid-build denkbar
(Slice 8 Content-Pass).

## 4. Person-Level „hat (nicht) gegessen" in der Kalorienrechnung
Mahlzeiten-Abhak existiert; Kalorien zählen aber nach Planbeteiligung. Verfeinerung:
pro Person am Tisch ab-/anwählen, Reste-Portionen in die Bilanz. Kosten: Meal-
Attendance-Datenmodell + kcal-Ledger ≈ 1 Slice. Erst nachdem Slice 5 die
kcal-Basis (pro Person aus Planbeteiligung) bewiesen hat.

## 5. Mobile-Feinschliff & Modernität
Über die Slice-8-Erste-Hilfe hinaus: Touch-Ziele, responsive Wochenstreifen-Details,
visuelle Befeuchtung ohne den „Prospekt-Nüchtern"-Vertrag zu brechen.

## Entscheidungsregel
Jeder Punkt: erst PoC-Demo durchspielen (60-Sekunden-Journey), dann bewerten, ob der
Kernel-Beweis (echte Angebote → valider Plan → nachrechenbare Liste) ohne den Punkt
schon trägt — nur ja: einplanen.
