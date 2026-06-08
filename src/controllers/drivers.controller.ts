import * as service from '../services/drivers.service';
import * as kycService from '../services/kyc.service';
export function health(_req:any,res:any){res.json({module:'drivers',ok:true})}
export async function register(req:any,res:any){res.json(await service.register(req.body, req.params, req.query));}
export async function apply(req:any,res:any){res.json(await service.apply({ ...req.body, actor: req.user }, req.params, req.query));}
export async function availability(req:any,res:any){res.json(await service.availability({ ...req.body, actor: req.user }, req.params, req.query));}
export async function availabilityById(req:any,res:any){res.json(await service.availabilityById({ ...req.body, actor: req.user }, req.params, req.query));}
export async function location(req:any,res:any){res.json(await service.location({ ...req.body, actor: req.user }, req.params, req.query));}
export async function locationById(req:any,res:any){res.json(await service.locationById({ ...req.body, actor: req.user }, req.params, req.query));}
export async function me(req:any,res:any){res.json(await service.me({ ...req.body, actor: req.user }, req.params, req.query));}
export async function currentTrip(req:any,res:any){res.json(await service.currentTrip({ ...req.body, actor: req.user }, req.params, req.query));}
export async function earnings(req:any,res:any){res.json(await service.earnings({ ...req.body, actor: req.user }, req.params, req.query));}
export async function documents(req:any,res:any){res.json(await service.documents({ ...req.body, actor: req.user }, req.params, req.query));}
export async function nearby(req:any,res:any){res.json(await service.nearby({ ...req.body, actor: req.user }, req.params, req.query));}
export async function createVehicle(req:any,res:any){res.json(await service.createVehicle({ ...req.body, actor: req.user }, req.params, req.query));}
export async function listVehicles(req:any,res:any){res.json(await service.listVehicles({ ...req.body, actor: req.user }, req.params, req.query));}
export async function deleteVehicle(req:any,res:any){res.json(await service.deleteVehicle({ ...req.body, actor: req.user }, req.params, req.query));}
export async function setActiveVehicle(req:any,res:any){res.json(await service.setActiveVehicle({ ...req.body, actor: req.user }, req.params, req.query));}
export async function saveVehicleProfile(req:any,res:any){res.json(await service.saveVehicleProfile({ ...req.body, actor: req.user }, req.params, req.query));}
export async function getVehicleProfile(req:any,res:any){res.json(await service.getVehicleProfile({ ...req.body, actor: req.user }, req.params, req.query));}
export async function uploadVehiclePhoto(req:any,res:any){res.json(await service.uploadVehiclePhoto({ ...req.body, actor: req.user, file: req.file }, req.params, req.query));}
export async function create_kyc_session(req:any,res:any){res.json(await kycService.create_session({ ...req.body, actor: req.user }, req.params, req.query));}
export async function kyc_status(req:any,res:any){res.json(await kycService.status({ ...req.body, actor: req.user }, req.params, req.query));}
