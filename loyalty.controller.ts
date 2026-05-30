import * as service from './loyalty.service';

export function health(_req: any, res: any) { res.json({ module: 'loyalty', ok: true }); }

export async function getAccount(req: any, res: any) {
  const result = await service.getAccount({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result.account ?? result);
}

export async function redeem(req: any, res: any) {
  const result = await service.redeemPoints({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function history(req: any, res: any) {
  const result = await service.getTransactionHistory({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result.transactions ?? result);
}

export async function award(req: any, res: any) {
  const result = await service.awardBonusPoints({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}
