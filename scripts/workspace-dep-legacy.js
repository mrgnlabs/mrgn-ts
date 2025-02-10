const fs = require("fs");
const path = require("path");

const packagesDir = path.resolve(__dirname, "../packages");
const packages = fs.readdirSync(packagesDir);

packages.forEach((pkg) => {
  const pkgPath = path.join(packagesDir, pkg, "package.json");

  // Check if package.json exists
  if (fs.existsSync(pkgPath)) {
    const pkgJson = require(pkgPath);

    if (pkgJson.dependencies) {
      Object.keys(pkgJson.dependencies).forEach((dep) => {
        // Change "workspace:*" to "*"
        if (pkgJson.dependencies[dep] === "workspace:*") {
          pkgJson.dependencies[dep] = "*";
        }
      });
    }

    // Write the updated package.json back to the file
    fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));
  }
});
