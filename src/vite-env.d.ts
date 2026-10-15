/// <reference types="vite/client" />

declare const __APP_BUILD_TIME__: string

declare module 'virtual:changelog' {
  const changelog: {
    /** ISO date of the newest commit in the build; it is the app's "version". */
    builtFrom: string | null
    entries: { hash: string; date: string; items: string[] }[]
  }
  export default changelog
}
