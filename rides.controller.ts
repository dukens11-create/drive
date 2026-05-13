import * as service from './rides.service';

export function health(_req: any, res: any) { res.json({ module: 'rides', ok: true }); }
export async function estimate(req: any, res: any) { res.json(await service.estimate(req.body, req.params, req.query)); }
export async function request(req: any, res: any) { res.json(await service.request(req.body, req.params, req.query)); }
export async function accept(req: any, res: any) { res.json(await service.accept(req.body, req.params, req.query)); }
export async function start(req: any, res: any) { res.json(await service.start(req.body, req.params, req.query)); }
export async function complete(req: any, res: any) { res.json(await service.complete(req.body, req.params, req.query)); }
export async function cancel(req: any, res: any) { res.json(await service.cancel(req.body, req.params, req.query)); }
export async function rate(req: any, res: any) { res.json(await service.rate(req.body, req.params, req.query)); }
