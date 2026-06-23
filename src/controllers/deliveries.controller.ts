import * as service from '../services/deliveries.service';

export function health(_req: any, res: any) { res.json({ module: 'deliveries', ok: true }); }
export async function estimate(req: any, res: any) { res.json(await service.estimate({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function create(req: any, res: any) {
  const payload = await service.create({ ...req.body, actor: req.user }, req.params, req.query);
  if (payload?.error) return res.status(400).json(payload);
  return res.status(201).json(payload);
}

