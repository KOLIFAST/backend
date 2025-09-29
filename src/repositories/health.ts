import sql from "../db/index.js";

async function getDbVersion() {
  const result = await sql`
    select version();
  `
  return result[0]
}

const healthRepository = {
  getDbVersion
}

export default healthRepository
