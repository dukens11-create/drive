import * as service from './scheduled.service';

export function health(_req: any, res: any) { res.json({ module: 'scheduled', ok: true }); }

export async function book(req: any, res: any) {
  const result = await service.bookScheduledRide({ ...req.body, actor: req.user }) as any;
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result.scheduledRide ?? result);
}

export async function cancel(req: any, res: any) {
  const id = req.params.id || req.body?.id;
  const result = await service.cancelScheduledRide({ ...req.body, id, actor: req.user }) as any;
  if (result.error) return res.status(400).json(result);
  res.json(result.scheduledRide ?? result);
}

export async function list(req: any, res: any) {
  const result = await service.listScheduledRides({ ...req.body, actor: req.user }) as any;
  if (result.error) return res.status(400).json(result);
  res.json(result.scheduledRides ?? result.rides ?? result);
}

export async function get(req: any, res: any) {
  const result = await service.getScheduledRide({ ...req.body, actor: req.user }, req.params) as any;
  if (result.error) return res.status(404).json(result);
  res.json(result.scheduledRide ?? result);
}
