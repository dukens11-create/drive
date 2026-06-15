import * as service from '../services/riders.service';

export function health(_req: any, res: any) { res.json({ module: 'riders', ok: true }); }
export async function register(req: any, res: any) { res.json(await service.register(req.body, req.params, req.query)); }
export async function me(req: any, res: any) { res.json(await service.me({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function location(req: any, res: any) { res.json(await service.location({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function profile(req: any, res: any) { res.json(await service.profile({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function update_profile(req: any, res: any) { res.json(await service.updateProfile({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function get_places(req: any, res: any) { res.json(await service.getPlaces({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function update_places(req: any, res: any) { res.json(await service.updatePlaces({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function riderTrips(req: any, res: any) { res.json(await service.riderTrips({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function riderTripReceipt(req: any, res: any) { res.json(await service.riderTripReceipt({ ...req.body, actor: req.user }, req.params, req.query)); }
