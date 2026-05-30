import * as service from './analytics.service';

export function health(_req: any, res: any) { res.json({ module: 'analytics', ok: true }); }

export async function overview(_req: any, res: any) {
  const result = await service.getPlatformOverview();
  res.json(result.overview ?? result);
}

export async function revenue(req: any, res: any) {
  res.json(await service.getRevenueAnalytics(req.body));
}

export async function rides(req: any, res: any) {
  res.json(await service.getRideAnalytics(req.body));
}

export async function drivers(_req: any, res: any) {
  res.json(await service.getDriverAnalytics());
}

export async function users(req: any, res: any) {
  res.json(await service.getUserAnalytics(req.body));
}

export async function kpis(_req: any, res: any) {
  const result = await service.getKpis() as any;
  const kpis = result.kpis ?? result;
  res.json({ activeDrivers: kpis.onlineDrivers ?? 0, ...kpis });
}

export async function churn(req: any, res: any) {
  const result = await service.getChurnAnalysis(req.body || {});
  res.json(result.churn ?? result);
}

export async function loyalty(_req: any, res: any) {
  res.json(await service.getLoyaltyAnalytics());
}
