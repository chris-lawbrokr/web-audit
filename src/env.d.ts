// Variables read by name in code (not through src/server/config/env.ts) need a declaration under the
// strictest settings, which forbid dot access on an index signature.
declare namespace NodeJS {
  interface ProcessEnv {
    readonly NEXT_RUNTIME?: 'nodejs' | 'edge';
  }
}
