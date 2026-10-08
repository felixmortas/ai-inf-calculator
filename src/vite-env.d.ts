/// <reference types="vite/client" />

declare module 'virtual:methodology-content' {
  /** HTML de la méthodologie, indexé par code de langue (`docs/methodology/<code>.md`). */
  const html: Readonly<Record<string, string>>;
  export default html;
}
