import * as service from './carpool.service';

export function health(_req: any, res: any) { res.json({ module: 'carpool', ok: true }); }

export async function create(req: any, res: any) {
  const result = await service.createCarpoolRide({ ...req.body, actor: req.user }) as any;
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result.ride ?? result);
}

export async function list(req: any, res: any) {
  const result = await service.listCarpoolRides({ ...req.body, actor: req.user }) as any;
  res.json(result.rides ?? result);
}

export async function get(req: any, res: any) {
  const result = await service.getCarpoolRide({ ...req.body, actor: req.user }, req.params) as any;
  if (result.error) return res.status(404).json(result);
  res.json(result.ride ?? result);
}

export async function join(req: any, res: any) {
  const result = await service.joinCarpoolRide({ ...req.body, actor: req.user }, req.params) as any;
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function leave(req: any, res: any) {
  const result = await service.leaveCarpoolRide({ ...req.body, actor: req.user }, req.params) as any;
  if (result.error) return res.status(400).json(result);
  res.json(result);
}
