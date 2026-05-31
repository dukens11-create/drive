export async function runSeeds() {
  return { ok: true, seeded: [] as string[] };
}

if (require.main === module) {
  runSeeds().then(result => {
    console.log(JSON.stringify(result, null, 2));
  });
}
