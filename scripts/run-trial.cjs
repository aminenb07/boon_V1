const { spawn } = require("child_process");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const backendDir = path.join(rootDir, "backend");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  await run("npm.cmd", ["run", "seed:local"], backendDir);
  await run("npm.cmd", ["run", "test-users:local"], backendDir);

  const backend = spawn("npm.cmd", ["run", "dev:local"], {
    cwd: backendDir,
    stdio: "inherit",
    shell: true,
  });

  const frontend = spawn("npm.cmd", ["run", "dev"], {
    cwd: rootDir,
    stdio: "inherit",
    shell: true,
  });

  const shutdown = () => {
    backend.kill();
    frontend.kill();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  backend.on("exit", (code) => {
    if (code && code !== 0) {
      frontend.kill();
      process.exit(code);
    }
  });

  frontend.on("exit", (code) => {
    if (code && code !== 0) {
      backend.kill();
      process.exit(code);
    }
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
