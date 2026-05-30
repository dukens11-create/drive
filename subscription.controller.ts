import * as service from './subscription.service';

export function health(_req: any, res: any) { res.json({ module: 'subscription', ok: true }); }

export async function listPlans(_req: any, res: any) {
  const result = await service.listPlans();
  res.json(result.plans ?? result);
}

export async function subscribe(req: any, res: any) {
  const result = await service.subscribe({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result.subscription ?? result);
}

export async function cancel(req: any, res: any) {
  const result = await service.cancelSubscription({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result.subscription ?? result);
}

export async function getMySubscription(req: any, res: any) {
  const result = await service.getMySubscription({ ...req.body, actor: req.user });
  if (result.error) return res.status(404).json(result);
  res.json(result.subscription ?? result);
}
