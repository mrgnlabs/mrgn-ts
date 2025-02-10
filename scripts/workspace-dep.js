const fs = require("fs");
const path = require("path");

const directories = ["../packages", "../apps"];

directories.forEach((dir) => {
  const fullPath = path.resolve(__dirname, dir);
  const packages = fs.readdirSync(fullPath);

  packages.forEach((pkg) => {
    const pkgPath = path.join(fullPath, pkg, "package.json");

    // Check if package.json exists
    if (fs.existsSync(pkgPath)) {
      const pkgJson = require(pkgPath);

      if (pkgJson.dependencies) {
        Object.keys(pkgJson.dependencies).forEach((dep) => {
          // Change "*" to "workspace:*"
          if (pkgJson.dependencies[dep] === "*") {
            pkgJson.dependencies[dep] = "workspace:*";
          }
        });
      }

      // Write the updated package.json back to the file
      fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2));
    }
  });
});
