export async function runMigrations() {
  return { ok: true, applied: [] as string[] };
}

if (require.main === module) {
  runMigrations().then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}
