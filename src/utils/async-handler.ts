export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve()
      .then(() => fn(req, res, next))
      .catch(next);
  };
}
