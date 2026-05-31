import * as service from '../services/auth.service';
export function health(_req:any,res:any){res.json({module:'auth',ok:true})}
function buildRequestContext(req: any) {
  return {
    ipAddress: req.ip,
    userAgent: typeof req.get === 'function' ? req.get('user-agent') : req.headers?.['user-agent']
  };
}
export async function signup(req:any,res:any){res.json(await service.signup({ ...req.body, ...buildRequestContext(req) }, req.params, req.query));}
export async function login(req:any,res:any){res.json(await service.login({ ...req.body, ...buildRequestContext(req) }, req.params, req.query));}
export async function refresh(req:any,res:any){res.json(await service.refresh({ ...req.body, ...buildRequestContext(req) }, req.params, req.query));}
export async function logout(req:any,res:any){res.json(await service.logout({ ...req.body, ...buildRequestContext(req) }, req.params, req.query));}
export async function sessions(req:any,res:any){res.json(await service.listSessions({ actor: req.user }, req.params, req.query));}
export async function login_history(req:any,res:any){res.json(await service.loginHistory({ actor: req.user }, req.params, req.query));}
export async function revoke_session(req:any,res:any){res.json(await service.revokeSession({ ...req.body, actor: req.user }, req.params, req.query));}
