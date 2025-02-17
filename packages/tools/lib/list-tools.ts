import fs from "fs";
import path from "path";

// list all available scripts with their descriptions
// fetch from package.json and run with --help to generate output
async function main() {
  const packageJsonPath = path.resolve(__dirname, "../", "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));

  console.log("\nAvailable tools:\n");

  const excludedScripts = ["lint", "lint:fix", "tools"];
  const scriptCommands = Object.entries(packageJson.scripts).filter(([name]) => !excludedScripts.includes(name));

  for (const [name, command] of scriptCommands) {
    try {
      const tsFile = (command as string).split(" ").pop();
      const fullPath = path.resolve(__dirname, "../", tsFile);

      const helpOutput = require("child_process").execSync(`tsx ${fullPath} --help`, { stdio: "pipe" }).toString();

      const excludedOptions = ["--help", "--version", "--env", "--group"];
      const optionsSection = helpOutput
        .split("\n")
        .slice(helpOutput.split("\n").findIndex((line) => line.includes("Options:")) + 1)
        .filter((line) => line.trim().startsWith("-"))
        .filter((line) => !excludedOptions.some((opt) => line.includes(opt)))
        .map((line) => line.trim())
        .join("\n  ");

      console.log(`pnpm ${name}`);
      console.log(`  Options:`);
      console.log(`  ${optionsSection || "No options available"}\n`);
    } catch (error) {
      console.log(`Unable to get details\n`);
    }
  }

  console.log("\nRun any script with --help for more details");
  console.log("Example: pnpm account:get --help\n");
}

main().catch((err) => {
  console.error(err);
});
