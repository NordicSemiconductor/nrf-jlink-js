// rollup.config.mjs
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "src/index.ts",
    output: {
      dir: "dist",
      format: "cjs",
    },
    plugins: [
      typescript({
        compilerOptions: { lib: ["es5", "es6", "dom"], target: "es5" },
      }),
    ],
    external: [
      "axios",
      "fs",
      "fs/promises",
      "os",
      "path",
      "@vscode/sudo-prompt",
      "child_process",
    ],
  },
];
