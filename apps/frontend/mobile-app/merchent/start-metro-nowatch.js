const path = require("path");
const metro = require("metro");

async function main() {
  const projectRoot = __dirname;
  const config = await metro.loadConfig({
    cwd: projectRoot,
    config: path.join(projectRoot, "metro.config.js"),
  });

  await metro.runServer(config, {
    host: "127.0.0.1",
    port: config.server.port,
    watch: false,
    waitForBundler: true,
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
