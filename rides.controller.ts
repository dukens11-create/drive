import * as service from './rides.service';

export function health(_req: any, res: any) { res.json({ module: 'rides', ok: true }); }
export async function estimate(req: any, res: any) { res.json(await service.estimate(req.body, req.params, req.query)); }
export async function history(req: any, res: any) { res.json(await service.history({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function detail(req: any, res: any) { res.json(await service.detail({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function request(req: any, res: any) { res.json(await service.request({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function accept(req: any, res: any) { res.json(await service.accept({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function start(req: any, res: any) { res.json(await service.start({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function complete(req: any, res: any) { res.json(await service.complete({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function cancel(req: any, res: any) { res.json(await service.cancel({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function rate(req: any, res: any) { res.json(await service.rate({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function receipt(req: any, res: any) { res.json(await service.receipt({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function notifications(req: any, res: any) { res.json(await service.notifications({ ...req.body, actor: req.user }, req.params, req.query)); }
