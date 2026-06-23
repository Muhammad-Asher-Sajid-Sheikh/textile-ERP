const { Client } = require('pg');
const url = 'postgresql://postgres:admin123@localhost:5432/textileerp?schema=public';
const client = new Client({ connectionString: url });

async function getRequisitions() {
  await client.connect();
  const res = await client.query('SELECT id, "requestedVolume", "volumeUnit" FROM "ProductionRequisition" LIMIT 4');
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

getRequisitions().catch(err => {
  console.error(err);
  process.exit(1);
});
