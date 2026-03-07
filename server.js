import app from './src/app.js'
import dotenv from 'dotenv'
import prisma from "./src/config/db.js";
import { testConnection } from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

await testConnection();

// Insert (upsert to avoid duplicate email error on restart)
const user = await prisma.users.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { name: "Prasant", email: "test@example.com" },
});

// Select
const users = await prisma.users.findMany();

console.log(users);

app.listen(PORT, () => {
    // console.log(process.env.DB_URL);
    console.log(`Server running on port ${PORT}`);
});