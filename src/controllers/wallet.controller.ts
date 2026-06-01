import * as service from '../services/wallet.service';
export function health(_req:any,res:any){res.json({module:'wallet',ok:true})}
export async function balance(req:any,res:any){res.json(await service.balance(req.body, req.params, req.query));}
export async function ledger(req:any,res:any){res.json(await service.ledger(req.body, req.params, req.query));}
export async function cashout(req:any,res:any){res.json(await service.cashout(req.body, req.params, req.query));}
export async function add_bank_account(req:any,res:any){res.json(await service.add_bank_account(req.body, req.params, req.query));}
export async function list_bank_accounts(req:any,res:any){res.json(await service.list_bank_accounts(req.body, req.params, req.query));}
export async function remove_bank_account(req:any,res:any){res.json(await service.remove_bank_account(req.body, req.params, req.query));}
export async function set_default_bank_account(req:any,res:any){res.json(await service.set_default_bank_account(req.body, req.params, req.query));}
export async function withdraw(req:any,res:any){res.json(await service.withdraw(req.body, req.params, req.query));}
export async function payout_history(req:any,res:any){res.json(await service.payout_history(req.body, req.params, req.query));}
export async function weekly_summary(req:any,res:any){res.json(await service.weekly_summary(req.body, req.params, req.query));}
