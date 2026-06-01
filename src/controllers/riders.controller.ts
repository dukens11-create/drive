import * as service from '../services/riders.service';

export function health(_req: any, res: any) { res.json({ module: 'riders', ok: true }); }
export async function register(req: any, res: any) { res.json(await service.register(req.body, req.params, req.query)); }
export async function me(req: any, res: any) { res.json(await service.me({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function location(req: any, res: any) { res.json(await service.location({ ...req.body, actor: req.user }, req.params, req.query)); }
