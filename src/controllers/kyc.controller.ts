import * as service from '../services/kyc.service';
export function health(_req:any,res:any){res.json({module:'kyc',ok:true})}
export async function create_session(req:any,res:any){res.json(await service.create_session(req.body, req.params, req.query));}
export async function status(req:any,res:any){res.json(await service.status(req.body, req.params, req.query));}
export async function webhook(req:any,res:any){res.json(await service.webhook(req.body, req.params, req.query));}
