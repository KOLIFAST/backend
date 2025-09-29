import postgres from "postgres";
const dbURL = process.env.DB_URL!
const sql = postgres(dbURL)
export default sql
