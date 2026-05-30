import * as service from '../services/support.service';
export function health(_req:any,res:any){res.json({module:'support',ok:true})}
export async function create_ticket(req:any,res:any){res.json(await service.create_ticket({...req.body, __actor: req.user}, req.params, req.query));}
export async function list_tickets(req:any,res:any){res.json(await service.list_tickets(req.body, req.params, req.query));}
export async function get_ticket(req:any,res:any){res.json(await service.get_ticket(req.body, req.params, req.query));}
export async function reply_ticket(req:any,res:any){res.json(await service.reply_ticket({...req.body, __actor: req.user}, req.params, req.query));}
export async function close_ticket(req:any,res:any){res.json(await service.close_ticket({...req.body, __actor: req.user}, req.params, req.query));}
export async function refund_review(req:any,res:any){res.json(await service.refund_review({...req.body, __actor: req.user}, req.params, req.query));}
