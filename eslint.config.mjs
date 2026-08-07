import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Material de referência do design, não código nosso: são os protótipos
    // .dc.html e o runtime deles. Ficam no projeto só para consulta.
    "design_handoff_cache_hub/**",
  ]),
]);

export default eslintConfig;
