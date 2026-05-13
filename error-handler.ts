export function errorHandler(err: any, _req: any, res: any, _next: any) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
}
