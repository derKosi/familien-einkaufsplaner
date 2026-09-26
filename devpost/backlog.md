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
Generalprobe (26.09.): generelle Unsicherheit, wie das Design auf dem Handy ankommt —
konkreter Fund war die Packungsmenge im Kleintext (geffixt, siehe checklist.md >
Revisions); Rest am Gerät auf dem Zweitrechner/praktisch prüfen.

## 6. Zweiwochen-Planung mit Übertrag (Checkpoint-Runde 4)
„Man plant zuerst die Gerichte für die nächsten 2 Wochen (zusammen mit dem
Nachbargrill, wir haben ja auch noch 6 fertig für morgen)": Plan-Historie statt
Einzelplan, listenübergreifende Gebinde-Optimierung („500 g Hack kaufen, über zwei
Wochen verwerten"), Fertig-/Reste-Übertrag in die nächste Woche. Kosten: 1–2 Slices
(Datenmodell + Listen-Merge). Startet sinnvoll NACH dem Budget-Rahmen (Slice 7),
weil die Vorschläge dann schon preissensitiv sortieren.

## 7. Budget-Rahmen über die Einstellungen hinaus
Slice 7 liefert die Münzen (1–3) als Gewichtung der Vorschlags-Sortierung. Später
denkbar: Wochenbudget-Wächter mit Summenwarnung auf der Liste.

## 8. Gericht entfernen/tauschen je Mahlzeit (Generalprobe 26.09.)
Bisher: Events ergänzen, Tage aussetzen. Fehlt: eine einzelne Mahlzeit am Tag durch
ein anderes Rezept ersetzen oder streichen — mit Listen-Neuberechnung (Gebinde-Effekte!
„Haferflocken raus → Packung weg?"). Kosten: PATCH /api/plan/meal (recipeId/null) +
Rezeptwahl-UI (Pool-Filter nach Tags/Quick) + Listen-Rescale ≈ 1 Slice. Verwandt mit
Item 1 (Planungswerkbank) — das hier ist die Kleinform davon.

## 9. Rezept-Vorlesen + Koch-Timer (Generalprobe 26.09.)
Vorlesefunktion (SpeechSynthesis, nur die Rezept-Schritte) und Timer/Zähler je
Zubereitungsschritt. Barrierefreiheit + Koch-Alltag; Nutzer: „muss nur das Rezept
vorlesen". Kosten: ½ Slice, kein Datenmodell-Bedarf, rein client-seitig.

## 10. Playwright-E2E auf dem Zweitrechner (26.09.)
Dieser Mac blockiert Chromium (Safari+AppleScript-Fall, siehe AGENTS.md); der
Zweitrechner hat Playwright. Kern-Journey als E2E gegen den Docker-Build
(seed → plan → Liste → Event). Kein Shipment-Blocker — schönes Post-PoC-Projekt.

## Entscheidungsregel
Jeder Punkt: erst PoC-Demo durchspielen (60-Sekunden-Journey), dann bewerten, ob der
Kernel-Beweis (echte Angebote → valider Plan → nachrechenbare Liste) ohne den Punkt
schon trägt — nur ja: einplanen.
