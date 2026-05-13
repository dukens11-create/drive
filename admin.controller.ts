import * as service from './admin.service';
export function health(_req:any,res:any){res.json({module:'admin',ok:true})}
export async function drivers_pending(req:any,res:any){res.json(await service.drivers_pending(req.body, req.params, req.query));}
export async function approve_driver(req:any,res:any){res.json(await service.approve_driver(req.body, req.params, req.query));}
export async function live_rides(req:any,res:any){res.json(await service.live_rides(req.body, req.params, req.query));}
export async function risk_alerts(req:any,res:any){res.json(await service.risk_alerts(req.body, req.params, req.query));}
export async function refunds(req:any,res:any){res.json(await service.refunds(req.body, req.params, req.query));}
