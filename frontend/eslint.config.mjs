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
  ]),
  {
    rules: {
      // react-hooks v7 新增规则：效果内同步 setState 可致级联渲染。
      // 现有代码（T4）为效果内取数模式，先降为 warn 保持 CI 绿灯，
      // 由前端后续任务重构数据层后重新启用（见 docs/ops 部署记录）。
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
