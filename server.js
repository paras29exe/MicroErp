import app from './src/app.js'
import dotenv from 'dotenv'
import pool from "./src/config/db.js"
import { testConnection } from './src/config/db.js'

dotenv.config();

const PORT = process.env.PORT || 5000;

await testConnection();

const testInsert = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                email VARCHAR(150) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log("✅ Table 'users' is ready");

        const result = await pool.query(
            "INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *",
            ["Prasant", "test@example.com"]
        );
 
        console.log("✅ Inserted:", result.rows[0]);
    } catch (err) {
        console.error("❌ Insert Failed:", err.message);
    }
};

// await testInsert();

const testSelect = async () => {
    try {
        const result = await pool.query(
            "SELECT * from users"
        );

        console.log("Select query executed " , result.rows)
    } catch (err) {
        console.error(err)
    }
}

await testSelect();

app.listen(PORT, () => {
    // console.log(process.env.DB_URL);
    console.log(`Server running on port ${PORT}`);
});