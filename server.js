import app from './src/app.js'
import dotenv from 'dotenv'
import prisma from "./src/config/db.js";
import { testConnection } from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

await testConnection();

// Insert (upsert to avoid duplicate email error on restart)
const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
        name: "Prasant",
        employeeId: "abc21",
        email: "test@example.com",
        passwordHash: "temporary-hash",
        role: "ADMIN",
    },
});

// Select
const users = await prisma.user.findMany();

console.log(users);

app.listen(PORT, () => {
    // console.log(process.env.DB_URL);
    console.log(`Server running on port ${PORT}`);
});