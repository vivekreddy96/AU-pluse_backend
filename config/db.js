require("dotenv").config();

const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function testDatabaseConnection() {
    try {
        const result = await sql`SELECT version()`;

        console.log("Neon PostgreSQL database connected successfully");
        console.log(result[0].version);
    } catch (error) {
        console.error("Neon PostgreSQL connection failed:", error.message);
    }
}

testDatabaseConnection();

module.exports = sql;