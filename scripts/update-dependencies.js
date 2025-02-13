const fs = require("fs");
const path = require("path");

const pkgJsonPath = path.resolve(__dirname, "../packages/marginfi-client-v2/package.json");

// Check if package.json exists
if (fs.existsSync(pkgJsonPath)) {
  const pkgJson = require(pkgJsonPath);

  if (pkgJson.dependencies) {
    Object.keys(pkgJson.dependencies).forEach((dep) => {
      const depPkgPath = path.resolve(__dirname, "../packages", dep.replace("@mrgnlabs/", ""), "package.json");

      // Check if the dependency package.json exists
      if (fs.existsSync(depPkgPath)) {
        const depPkgJson = require(depPkgPath);

        // Set the dependency version to the actual version if it is "workspace:*"
        if (pkgJson.dependencies[dep] === "workspace:*") {
          pkgJson.dependencies[dep] = depPkgJson.version;
        }
      }
    });
  }

  // Write the updated package.json back to the file
  fs.writeFileSync(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
}
