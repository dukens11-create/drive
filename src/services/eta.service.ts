export async function estimateRoute(input: any) {
  const distanceMiles = Number(input?.distanceMiles ?? 3.2);
  const etaMinutes = Number(input?.etaMinutes ?? Math.max(8, Math.round(distanceMiles * 3.5)));
  return {
    provider: 'mapbox_or_google',
    distanceMiles,
    etaMinutes,
    polyline: 'mfp_Ih}~pAfCwK`GeV'
  };
}
