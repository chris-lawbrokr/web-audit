export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validates the environment at boot; a bad value fails every request and logs the full list.
    await import('@/server/config/env');
  }
}
