import * as service from './corporate.service';

export function health(_req: any, res: any) { res.json({ module: 'corporate', ok: true }); }

export async function create(req: any, res: any) {
  const result = await service.createCorporateAccount({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.status(201).json(result.account ?? result);
}

export async function list(_req: any, res: any) {
  const result = await service.listCorporateAccounts();
  res.json(result.accounts ?? result);
}

export async function get(req: any, res: any) {
  const result = await service.getCorporateAccount({ ...req.body, actor: req.user }, req.params);
  if (result.error) return res.status(404).json(result);
  res.json(result.account ?? result);
}

export async function addEmployee(req: any, res: any) {
  const result = await service.addEmployee({ ...req.body, actor: req.user }, req.params);
  if (result.error) return res.status(400).json(result);
  res.json(result.account ?? result);
}

export async function removeEmployee(req: any, res: any) {
  const result = await service.removeEmployee({ ...req.body, actor: req.user }, req.params);
  if (result.error) return res.status(400).json(result);
  res.json(result.account ?? result);
}

export async function tagRide(req: any, res: any) {
  const result = await service.tagRideAsCorporate({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function invoice(req: any, res: any) {
  const result = await service.getCorporateInvoice({ ...req.body, actor: req.user }, req.params);
  if (result.error) return res.status(404).json(result);
  res.json(result);
}
