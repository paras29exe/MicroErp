import pkg from "pg";
import dotenv from "dotenv";

dotenv.config()

const { Pool } = pkg

const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: true,
})

export const testConnection = async () => {
    try {
        const client = await pool.connect();
        console.log("✅ Database Connected Successfully");
        client.release();
    } catch (err) {
        console.error("❌ Database Connection Failed:", err.message);
    }

    try {
        const result = await pool.query("SELECT NOW()");
        console.log("✅ DB Time:", result.rows[0].now);
    } catch (err) {
        console.error("❌ Query Failed:", err.message);
    }
};

export default pool