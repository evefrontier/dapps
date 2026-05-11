const {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} = require("node:fs");
const { dirname, join } = require("node:path");

const distDir = join(__dirname, "../dist");
const fileExtensions = [".js", ".d.ts"];

const hasExplicitExtension = (specifier) => /\.[a-zA-Z0-9]+$/.test(specifier);

const resolveSpecifier = (filePath, specifier) => {
  if (!specifier.startsWith("./") && !specifier.startsWith("../")) {
    return specifier;
  }

  if (hasExplicitExtension(specifier)) {
    return specifier;
  }

  const target = join(dirname(filePath), specifier);
  if (existsSync(`${target}.js`) || existsSync(`${target}.d.ts`)) {
    return `${specifier}.js`;
  }

  if (
    existsSync(target) &&
    statSync(target).isDirectory() &&
    (existsSync(join(target, "index.js")) ||
      existsSync(join(target, "index.d.ts")))
  ) {
    return `${specifier}/index.js`;
  }

  return specifier;
};

const patchFile = (filePath) => {
  const original = readFileSync(filePath, "utf8");
  let patched = original.replace(
    /(from\s+["'])(\.\.?\/[^"']+)(["'])/g,
    (_match, prefix, specifier, suffix) =>
      `${prefix}${resolveSpecifier(filePath, specifier)}${suffix}`,
  );

  patched = patched.replace(
    /(import\s+["'])(\.\.?\/[^"']+)(["'])/g,
    (_match, prefix, specifier, suffix) =>
      `${prefix}${resolveSpecifier(filePath, specifier)}${suffix}`,
  );

  patched = patched.replace(
    /(import\s*\(\s*["'])(\.\.?\/[^"']+)(["']\s*\))/g,
    (_match, prefix, specifier, suffix) =>
      `${prefix}${resolveSpecifier(filePath, specifier)}${suffix}`,
  );

  if (patched !== original) {
    writeFileSync(filePath, patched);
  }
};

const walk = (dir) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      walk(path);
      continue;
    }

    if (fileExtensions.some((extension) => path.endsWith(extension))) {
      patchFile(path);
    }
  }
};

if (!existsSync(distDir)) {
  throw new Error(
    "dist directory does not exist. Run tsc before fixing ESM extensions.",
  );
}

walk(distDir);
