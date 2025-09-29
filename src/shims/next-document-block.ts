// This shim prevents accidental usage of `next/document` in the App Router code.
// If something imports from `next/document`, it will throw at import-time with a clearer error.

throw new Error(
  "Detected an import from 'next/document'. In the App Router (app/), do not import Html, Head, Main, or NextScript. Use app/layout.tsx with <html> and <body> tags instead."
);


