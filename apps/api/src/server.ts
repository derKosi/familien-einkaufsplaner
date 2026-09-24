import Fastify from "fastify";
import { getState, seedDemoHousehold } from "./household-repo.js";
import { migrate } from "./db/migrate.js";
import { latestOffersResponse, refreshOffers } from "./offers/store.js";
import { RefreshOffersResponse } from "@fep/shared";

migrate();

const app = Fastify({ logger: true });

app.get("/api/state", async () => getState());

app.post("/api/household/demo", async () => seedDemoHousehold());

app.get("/api/offers/latest", async () => latestOffersResponse());

app.post("/api/offers/refresh", async () => RefreshOffersResponse.parse({ offers: refreshOffers() }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
