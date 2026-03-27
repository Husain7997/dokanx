const { spawnSync } = require("node:child_process");

const commands = [
  ["npm", ["--prefix", "apps/frontend/storefront-web", "run", "build"]],
  ["npm", ["--prefix", "apps/frontend/merchant-dashboard", "run", "build"]],
  ["npm", ["--prefix", "apps/frontend/admin-panel", "run", "build"]],
  ["npm", ["--prefix", "apps/frontend/developer-portal", "run", "build"]],
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
