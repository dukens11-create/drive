import * as service from './admin.service';
export function health(_req:any,res:any){res.json({module:'admin',ok:true})}
export async function drivers_pending(req:any,res:any){res.json(await service.drivers_pending(req.body, req.params, req.query));}
export async function approve_driver(req:any,res:any){res.json(await service.approve_driver({...req.body, __actor: req.user}, req.params, req.query));}
export async function live_rides(req:any,res:any){res.json(await service.live_rides(req.body, req.params, req.query));}
export async function risk_alerts(req:any,res:any){res.json(await service.risk_alerts(req.body, req.params, req.query));}
export async function refunds(req:any,res:any){res.json(await service.refunds(req.body, req.params, req.query));}
export async function platform_stats(req:any,res:any){res.json(await service.platform_stats(req.body, req.params, req.query));}
export async function list_users(req:any,res:any){res.json(await service.list_users(req.body, req.params, req.query));}
export async function suspend_user(req:any,res:any){res.json(await service.suspend_user({...req.body, __actor: req.user}, req.params, req.query));}
export async function update_ticket(req:any,res:any){res.json(await service.update_ticket({...req.body, __actor: req.user}, req.params, req.query));}
export async function audit_log(req:any,res:any){res.json(await service.audit_log(req.body, req.params, req.query));}
