import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { join } from "node:path";
import { readFile } from "node:fs/promises";
import { getState, seedDemoHousehold } from "./household-repo.js";
import { migrate } from "./db/migrate.js";
import { latestOffersResponse, refreshOffers } from "./offers/store.js";
import { registerPlanRoutes } from "./routes/plan.js";
import { registerHouseholdRoutes } from "./routes/household.js";
import { RefreshOffersResponse } from "@fep/shared";

migrate();

const app = Fastify({ logger: true });

app.get("/api/state", async () => getState());

app.post("/api/household/demo", async () => seedDemoHousehold());

app.get("/api/offers/latest", async () => latestOffersResponse());

app.post("/api/offers/refresh", async () => RefreshOffersResponse.parse({ offers: refreshOffers() }));

await registerPlanRoutes(app);
await registerHouseholdRoutes(app);

// Auslieferung (spec.md > Stack: „Fastify serviert die gebaute SPA statisch mit"):
// im Container zeigt FEP_WEB_DIST auf das Vite-Build — ohne die Variable ist das
// reine API-Entwickler-Setup mit Vite-Dev-Server.
const webDist = process.env.FEP_WEB_DIST;
if (webDist) {
  await app.register(fastifyStatic, { root: join(webDist) });
  app.setNotFoundHandler(async (request, reply) => {
    if (request.url.startsWith("/api/")) {
      return reply.code(404).send({ error: "Unbekannter Endpunkt.", code: "not_found" });
    }
    const index = await readFile(join(webDist, "index.html"));
    return reply.type("text/html").send(index);
  });
}

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
