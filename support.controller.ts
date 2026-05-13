import * as service from './support.service';
export function health(_req:any,res:any){res.json({module:'support',ok:true})}
export async function create_ticket(req:any,res:any){res.json(await service.create_ticket(req.body, req.params, req.query));}
export async function list_tickets(req:any,res:any){res.json(await service.list_tickets(req.body, req.params, req.query));}
export async function refund_review(req:any,res:any){res.json(await service.refund_review(req.body, req.params, req.query));}
