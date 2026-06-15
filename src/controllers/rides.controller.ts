import * as service from '../services/rides.service';

export function health(_req: any, res: any) { res.json({ module: 'rides', ok: true }); }
export async function estimate(req: any, res: any) { res.json(await service.estimate(req.body, req.params, req.query)); }
export async function history(req: any, res: any) { res.json(await service.history({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function detail(req: any, res: any) { res.json(await service.detail({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function assignedDriver(req: any, res: any) { res.json(await service.assignedDriver({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function request(req: any, res: any) { res.json(await service.request({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function driverRideRequests(req: any, res: any) {
  const payload = await service.getDriverRideRequests({ ...req.body, actor: req.user }, req.params, req.query);
  if (payload?.error === 'forbidden') return res.status(403).json(payload);
  return res.json(payload);
}
export async function accept(req: any, res: any) { res.json(await service.accept({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function decline(req: any, res: any) { res.json(await service.decline({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function updateStatus(req: any, res: any) { res.json(await service.updateStatus({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function arrive(req: any, res: any) { res.json(await service.arrive({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function start(req: any, res: any) { res.json(await service.start({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function complete(req: any, res: any) { res.json(await service.complete({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function noShow(req: any, res: any) { res.json(await service.noShow({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function driverCancel(req: any, res: any) { res.json(await service.driverCancel({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function ratePassenger(req: any, res: any) { res.json(await service.ratePassenger({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function message(req: any, res: any) { res.json(await service.message({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function cancel(req: any, res: any) { res.json(await service.cancel({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function rate(req: any, res: any) { res.json(await service.rate({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function submitRating(req: any, res: any) { res.json(await service.submitRating({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function receipt(req: any, res: any) { res.json(await service.receipt({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function notifications(req: any, res: any) { res.json(await service.notifications({ ...req.body, actor: req.user }, req.params, req.query)); }
export async function createShareLink(req: any, res: any) {
  const payload = await service.createShareLink({ ...req.body, actor: req.user }, req.params, req.query);
  if (payload?.error) {
    if (payload.error === 'forbidden') return res.status(403).json(payload);
    if (payload.error === 'ride not found') return res.status(404).json(payload);
    if (payload.error === 'rideId is required') return res.status(400).json(payload);
    if (payload.error === 'ride cannot be shared in its current state') return res.status(409).json(payload);
    return res.status(400).json(payload);
  }
  return res.json(payload);
}
export async function sharedRide(req: any, res: any) {
  const payload = await service.sharedRide({ ...req.body, actor: req.user }, req.params, req.query);
  if (payload?.error) {
    if (payload.error === 'ride not found') return res.status(404).json(payload);
    if (payload.error === 'rideId is required' || payload.error === 'token is required') return res.status(400).json(payload);
    if (payload.error === 'share link expired') return res.status(410).json(payload);
    return res.status(403).json(payload);
  }
  return res.json(payload);
}
