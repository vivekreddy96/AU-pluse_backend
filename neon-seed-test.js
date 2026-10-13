require("dotenv").config();

const { neon } = require("@neondatabase/serverless");

const db = neon(process.env.DATABASE_URL);

async function test() {
    try {
        const rollNo = "24eg112a01";
        const emailAddress = `${rollNo}@anurag.edu.in`;

        console.log("Testing email:", emailAddress);

        const result = await db`
            SELECT id, role
            FROM users
            WHERE email = ${emailAddress}
            LIMIT 1
        `;

        console.log("QUERY RESULT:");
        console.log(result);

        console.log("EXACT QUERY PASSED");
    } catch (error) {
        console.error("QUERY FAILED");
        console.error("Message:", error.message);
        console.error("Name:", error.name);
        console.error("Cause:", error.cause);
        console.error("Stack:", error.stack);
    }
}

test();