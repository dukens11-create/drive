import * as service from '../services/safety.service';
export function health(_req:any,res:any){res.json({module:'safety',ok:true})}
export async function sos(req:any,res:any){res.json(await service.sos(req.body, req.params, req.query));}
export async function share_trip(req:any,res:any){res.json(await service.share_trip(req.body, req.params, req.query));}
export async function incident_report(req:any,res:any){res.json(await service.incident_report(req.body, req.params, req.query));}
export async function list_incidents(req:any,res:any){res.json(await service.list_incidents(req.body, req.params, req.query));}
export async function update_incident(req:any,res:any){res.json(await service.update_incident({...req.body, __actor: req.user}, req.params, req.query));}
