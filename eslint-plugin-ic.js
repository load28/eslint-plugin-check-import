const fs = require("fs");
const ts = require("typescript");
const path = require("path");
const tsconfigPaths = require("tsconfig-paths");
const { minimatch } = require("minimatch");

module.exports = {
  rules: {
    "check-import": {
      meta: {
        type: "problem",
        schema: [],
      },
      create: function (context) {
        const root = context.settings.root;
        const filePath = context.getFilename();
        const tsConfigPath = path.join(root, "tsconfig.json");
        const tsConfigData = fs.readFileSync(tsConfigPath, "utf8");
        const tsConfig = ts.parseConfigFileTextToJson(
          tsConfigPath,
          tsConfigData
        ).config;
        const { baseUrl, paths } = tsConfig.compilerOptions;

        const packageJsonPath = path.join(root, "package.json");
        const packageJsonData = fs.readFileSync(packageJsonPath, "utf8");
        const packageJson = JSON.parse(packageJsonData);
        const { dependencies, devDependencies, checkImport } = packageJson;

        const defaultValue = checkImport.default;
        const element = checkImport.element;
        const rules = checkImport.rules;
        const ignorePatterns = checkImport.ignore || [];

        const matchPath = tsconfigPaths.createMatchPath(baseUrl, paths);
        const checkTsPath = (importPath) => {
          return Object.keys(paths).some((tsAlias) => {
            if (tsAlias.endsWith("/*")) {
              return minimatch(importPath, tsAlias + "*");
            }
            return minimatch(importPath, tsAlias + "/**");
          });
        };

        const getAbsolutePath = (importPath) => {
          if (checkTsPath(importPath)) {
            const resolvedPath = matchPath(importPath, undefined, undefined, [
              ".ts",
            ]);
            return path.resolve(baseUrl || "", resolvedPath || "");
          } else {
            const currentFilePath = context.getFilename();
            const currentDir = path.dirname(currentFilePath);
            return path.resolve(currentDir, importPath);
          }
        };

        return {
          ImportDeclaration: function (node) {
            const isIgnore = ignorePatterns.some((pattern) => {
              return minimatch(filePath, path.join(root, "**/" + pattern));
            });

            if (isIgnore) {
              return;
            }

            const importPath = node.source.value;
            const isDependency = Object.keys(dependencies).some((key) =>
              importPath.startsWith(key)
            );
            const isDevDependency = Object.keys(devDependencies).some((key) =>
              importPath.startsWith(key)
            );

            if (isDependency || isDevDependency) {
              return;
            }

            const absolutePath = getAbsolutePath(importPath);
            const elementType = element.find((el) =>
              minimatch(filePath, path.join(root, el.pattern))
            );

            const elementRules = rules.filter(
              (rule) => rule.from === elementType.type
            );

            if (elementRules.length === 0) {
              if (defaultValue === "allow") {
                return;
              } else {
                context.report({
                  node,
                  message: `Importing from this path is not allowed: ${importPath}`,
                });
                return;
              }
            }

            const allowedElementTypes = elementRules.reduce((acc, rule) => {
              return acc.concat(rule.allow || []);
            }, []);
            const disallowedElementTypes = elementRules.reduce((acc, rule) => {
              return acc.concat(rule.disallow || []);
            }, []);

            const allowedRules = allowedElementTypes
              .map((type) => element.find((rule) => rule.type === type))
              .map((rule) => rule.pattern);
            const disallowedRules = disallowedElementTypes
              .map((type) => element.find((rule) => rule.type === type))
              .map((rule) => rule.pattern);

            const isAllow = allowedRules.some((pattern) => {
              return minimatch(absolutePath, path.join(root, pattern));
            });

            const isDisallow = disallowedRules.some((pattern) => {
              return minimatch(absolutePath, path.join(root, pattern));
            });

            if (disallowedRules.length && isDisallow) {
              context.report({
                node,
                message: `Importing from this path is not allowed: ${importPath}`,
              });
            } else if (allowedRules.length && !isAllow) {
              context.report({
                node,
                message: `Importing from this path is not allowed: ${importPath}`,
              });
            } else {
              if (defaultValue === "disallow") {
                context.report({
                  node,
                  message: `Importing from this path is not allowed: ${importPath}`,
                });
              }
            }
          },
        };
      },
    },
  },
};
