import * as service from '../services/marketplace.service';
export function health(_req: any, res: any) { res.json({ module: 'marketplace', ok: true }); }
export async function same_day_dispatch(req: any, res: any) { res.json(await service.same_day_dispatch(req.body, req.params, req.query)); }
export async function delivery_options(req: any, res: any) { res.json(await service.delivery_options(req.body, req.params, req.query)); }
export async function get_surge(req: any, res: any) { res.json(await service.get_surge(req.body, req.params, req.query)); }
export async function set_surge(req: any, res: any) { res.json(await service.set_surge(req.body, req.params, req.query)); }
export async function create_promo(req: any, res: any) { res.json(await service.create_promo(req.body, req.params, req.query)); }
export async function list_promos(req: any, res: any) { res.json(await service.list_promos(req.body, req.params, req.query)); }
export async function get_referral_code(req: any, res: any) { res.json(await service.get_referral_code({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function register_referral(req: any, res: any) { res.json(await service.register_referral({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function list_referrals(req: any, res: any) { res.json(await service.list_referrals({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function create_market(req: any, res: any) { res.json(await service.create_market(req.body, req.params, req.query)); }
export async function list_markets(req: any, res: any) { res.json(await service.list_markets(req.body, req.params, req.query)); }
export async function update_market_status(req: any, res: any) { res.json(await service.update_market_status(req.body, req.params, req.query)); }

