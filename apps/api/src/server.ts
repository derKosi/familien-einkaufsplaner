import Fastify from "fastify";
import { getState, seedDemoHousehold } from "./household-repo.js";
import { migrate } from "./db/migrate.js";

migrate();

const app = Fastify({ logger: true });

app.get("/api/state", async () => getState());

app.post("/api/household/demo", async () => seedDemoHousehold());

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
