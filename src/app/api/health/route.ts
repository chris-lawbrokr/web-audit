/** Liveness for uptime checks; never calls a provider. Database reachability joins once the database does. */
export function GET() {
  return Response.json({ status: 'ok' });
}
