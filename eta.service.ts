export async function estimateRoute(input: any) {
  return {
    provider: 'mapbox_or_google',
    distanceMiles: input.distanceMiles ?? 3.2,
    etaMinutes: input.etaMinutes ?? 12,
    polyline: 'TODO_ROUTE_POLYLINE'
  };
}
