import { createServer } from "node:http";
import app from "./app";
import { logger } from "./lib/logger";
import { attachRealtime } from "./lib/rooms";
import { refreshFootballData } from "./lib/football";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = createServer(app);
attachRealtime(server);
void refreshFootballData().then((state) => {
  logger.info(
    { source: state.source, freshness: state.freshness, updatedAt: state.updatedAt },
    "Football data refresh completed",
  );
});
setInterval(() => {
  void refreshFootballData().then((state) => {
    logger.info(
      { source: state.source, freshness: state.freshness, updatedAt: state.updatedAt },
      "Scheduled football data refresh completed",
    );
  });
}, 1000 * 60 * 60 * 12);

server.on("error", (err) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

server.listen(port, () => {
  logger.info({ port }, "Server listening");
});
