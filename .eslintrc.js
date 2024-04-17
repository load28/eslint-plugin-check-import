module.exports = {
  root: true,
  overrides: [
    {
      files: ["*.html"],
      extends: ["plugin:@angular-eslint/template/recommended"],
    },
    {
      files: ["*.ts"],
      parser: "@typescript-eslint/parser",
      plugins: ["ic"],
      settings: {
        "import/resolver": {
          typescript: {
            alwaysTryTypes: true,
          },
        },
      },
      rules: {
        "ic/check-dependencies": "error",
      },
    },
  ],
};
