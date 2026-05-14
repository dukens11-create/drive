import * as service from './auth.service';
export function health(_req:any,res:any){res.json({module:'auth',ok:true})}
export async function signup(req:any,res:any){res.json(await service.signup(req.body, req.params, req.query));}
export async function login(req:any,res:any){res.json(await service.login(req.body, req.params, req.query));}
export async function refresh(req:any,res:any){res.json(await service.refresh(req.body, req.params, req.query));}
export async function logout(req:any,res:any){res.json(await service.logout(req.body, req.params, req.query));}
