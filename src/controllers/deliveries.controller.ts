import * as service from '../services/deliveries.service';

export async function create(req: any, res: any) { res.json(await service.create({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function detail(req: any, res: any) { res.json(await service.detail({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function available(req: any, res: any) { res.json(await service.available({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function accept(req: any, res: any) { res.json(await service.accept({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function updateStatus(req: any, res: any) { res.json(await service.updateStatus({ ...req.body, actor: req.user }, req.params, req.query)); }

