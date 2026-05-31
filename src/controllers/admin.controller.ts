import * as service from '../services/admin.service';

export function health(_req: any, res: any) { res.json({ module: 'admin', ok: true }); }
export async function drivers_pending(req: any, res: any) { res.json(await service.drivers_pending(req.body, req.params, req.query)); }
export async function approve_driver(req: any, res: any) { res.json(await service.approve_driver({ ...req.body, __actor: req.user }, req.params, req.query)); }
export async function live_rides(req: any, res: any) { res.json(await service.live_rides(req.body, req.params, req.query)); }
export async function risk_alerts(req: any, res: any) { res.json(await service.risk_alerts(req.body, req.params, req.query)); }
export async function refunds(req: any, res: any) { res.json(await service.refunds(req.body, req.params, req.query)); }
export async function platform_stats(req: any, res: any) { res.json(await service.platform_stats(req.body, req.params, req.query)); }
export async function admin_overview(req: any, res: any) { res.json(await service.admin_overview(req.body, req.params, req.query)); }
export async function list_users(req: any, res: any) { res.json(await service.list_users(req.body, req.params, req.query)); }
export async function suspend_user(req: any, res: any) { res.json(await service.suspend_user({ ...req.body, __actor: req.user }, req.params, req.query)); }
export async function update_ticket(req: any, res: any) { res.json(await service.update_ticket({ ...req.body, __actor: req.user }, req.params, req.query)); }
export async function audit_log(req: any, res: any) { res.json(await service.audit_log(req.query, req.params, req.query)); }
export async function update_settings(req: any, res: any) { res.json(await service.update_settings({ ...req.body, __actor: req.user }, req.params, req.query)); }
export async function upsert_promo(req: any, res: any) { res.json(await service.upsert_promo({ ...req.body, __actor: req.user }, req.params, req.query)); }
export async function upsert_market(req: any, res: any) { res.json(await service.upsert_market({ ...req.body, __actor: req.user }, req.params, req.query)); }
export async function create_api_key(req: any, res: any) { res.json(await service.create_api_key({ ...req.body, __actor: req.user }, req.params, req.query)); }
export async function revoke_api_key(req: any, res: any) { res.json(await service.revoke_api_key({ ...req.body, __actor: req.user }, req.params, req.query)); }
