require("dotenv").config();

const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

async function test() {
    try {
        console.log("TEST 1");
        console.log(await sql`SELECT 1 AS test`);

        console.log("TEST 2");
        console.log(await sql`SELECT current_database()`);

        console.log("TEST 3");
        console.log(
            await sql`SELECT COUNT(*) FROM information_schema.tables`
        );

        console.log("ALL TESTS PASSED");
    } catch (error) {
        console.error("FAILED:", error);
        console.error("CAUSE:", error.cause);
        console.error("STACK:", error.stack);
    }
}

test();