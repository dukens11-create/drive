import * as service from './marketplace.service';
export function health(_req:any,res:any){res.json({module:'marketplace',ok:true})}
export async function same_day_dispatch(req:any,res:any){res.json(await service.same_day_dispatch(req.body, req.params, req.query));}
export async function delivery_options(req:any,res:any){res.json(await service.delivery_options(req.body, req.params, req.query));}
