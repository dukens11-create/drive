import * as service from '../services/kyc.service';
export function health(_req:any,res:any){res.json({module:'kyc',ok:true})}
export async function create_session(req:any,res:any){res.json(await service.create_session({ ...req.body, actor: req.user }, req.params, req.query));}
export async function status(req:any,res:any){res.json(await service.status({ ...req.body, actor: req.user }, req.params, req.query));}
export async function webhook(req:any,res:any){res.json(await service.webhook({ ...req.body, headers: req.headers }, req.params, req.query));}
