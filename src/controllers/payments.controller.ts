import * as service from '../services/payments.service';
export function health(_req:any,res:any){res.json({module:'payments',ok:true})}
export async function create_intent(req:any,res:any){res.json(await service.create_intent(req.body, req.params, req.query));}
export async function capture(req:any,res:any){res.json(await service.capture(req.body, req.params, req.query));}
export async function refund(req:any,res:any){res.json(await service.refund(req.body, req.params, req.query));}
export async function stripe_webhook(req:any,res:any){res.json(await service.stripe_webhook(req.body, req.params, req.query, req.headers));}
export async function save_method(req:any,res:any){res.json(await service.save_method(req.body, req.params, req.query));}
export async function list_methods(req:any,res:any){res.json(await service.list_methods(req.body, req.params, req.query));}
export async function set_default_method(req:any,res:any){res.json(await service.set_default_method(req.body, req.params, req.query));}
export async function remove_method(req:any,res:any){res.json(await service.remove_method(req.body, req.params, req.query));}
export async function get_invoice(req:any,res:any){res.json(await service.get_invoice(req.body, req.params, req.query));}
export async function list_invoices(req:any,res:any){res.json(await service.list_invoices(req.body, req.params, req.query));}
export async function list_refunds(req:any,res:any){res.json(await service.list_refunds(req.body, req.params, req.query));}
