import * as service from '../services/merchant.service';
export function health(_req:any,res:any){res.json({module:'merchant',ok:true})}
export async function create_product(req:any,res:any){res.json(await service.create_product(req.body, req.params, req.query));}
export async function list_products(req:any,res:any){res.json(await service.list_products(req.body, req.params, req.query));}
export async function orders(req:any,res:any){res.json(await service.orders(req.body, req.params, req.query));}
export async function payouts(req:any,res:any){res.json(await service.payouts(req.body, req.params, req.query));}
