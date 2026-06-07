import * as service from '../services/search.service';

function sendResult(res: any, result: any) {
  if (result?.error) return res.status(400).json(result);
  return res.json(result);
}

export function health(_req: any, res: any) {
  res.json({ module: 'search', ok: true });
}

export async function drivers(req: any, res: any) {
  sendResult(res, await service.searchDrivers(req.query, req.user));
}

export async function rides(req: any, res: any) {
  sendResult(res, await service.searchRides(req.query, req.user));
}

export async function save(req: any, res: any) {
  sendResult(res, await service.saveSearch(req.body, req.user));
}

export async function recent(req: any, res: any) {
  sendResult(res, await service.recentSearches(req.query, req.user));
}
