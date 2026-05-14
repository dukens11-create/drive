import * as service from './payments.service';
export function health(_req:any,res:any){res.json({module:'payments',ok:true})}
export async function create_intent(req:any,res:any){res.json(await service.create_intent(req.body, req.params, req.query));}
export async function capture(req:any,res:any){res.json(await service.capture(req.body, req.params, req.query));}
export async function refund(req:any,res:any){res.json(await service.refund(req.body, req.params, req.query));}
export async function stripe_webhook(req:any,res:any){res.json(await service.stripe_webhook(req.body, req.params, req.query, req.headers));}
