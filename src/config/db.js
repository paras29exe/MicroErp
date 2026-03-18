import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export const testConnection = async () => {
    try {
        const time = await prisma.$queryRaw`SELECT NOW()`;
        console.log("✅ Database Connected Successfully");
        console.log("Current Time:", time[0].now);
    } catch (err) {
        console.error("❌ Database Connection Failed:", err);
    }
};

export default prisma;