import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  // Ignore generated files and build output
  {
    ignores: [".next/**", "node_modules/**"],
  },

  // Next.js recommended configs
  ...compat.extends("next/core-web-vitals", "next/typescript"),

  // Disallow next/document imports in all source files (Flat config style uses separate entries instead of overrides)
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "next/document",
              message:
                "Do not import from next/document. App Router replaces _document with app/layout.tsx.",
            },
          ],
        },
      ],
    },
  },

  // Allow next/document specifically in the classic Pages Document file
  {
    files: ["pages/_document.tsx", "pages/_document.jsx"],
    rules: {
      "no-restricted-imports": "off",
    },
  },

  // Disable triple-slash-reference rule for Next.js auto-generated files
  {
    files: ["next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];

export default eslintConfig;
