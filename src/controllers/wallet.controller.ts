import * as service from '../services/wallet.service';
export function health(_req:any,res:any){res.json({module:'wallet',ok:true})}
export async function balance(req:any,res:any){res.json(await service.balance(req.body, req.params, req.query));}
export async function ledger(req:any,res:any){res.json(await service.ledger(req.body, req.params, req.query));}
export async function cashout(req:any,res:any){res.json(await service.cashout(req.body, req.params, req.query));}
