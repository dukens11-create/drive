import * as service from './fraud.service';

export function health(_req: any, res: any) { res.json({ module: 'fraud', ok: true }); }

export async function check(req: any, res: any) {
  const result = await service.checkUser({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function listAlerts(req: any, res: any) {
  const result = await service.listFraudAlerts({ ...req.body, actor: req.user });
  res.json(result.alerts ?? result);
}

export async function review(req: any, res: any) {
  const result = await service.reviewFraudAlert({ ...req.body, actor: req.user }, req.params);
  if (result.error) return res.status(404).json(result);
  res.json(result);
}
