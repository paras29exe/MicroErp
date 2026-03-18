import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import globalRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import prisma from './config/db.js';
import bcrypt from 'bcrypt';
import { ApiResponse, ApiError } from './utils/response.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res
    .status(200)
    .json({ message: 'MicroERP API Running' });
});

// Temporary bootstrap endpoint: remove after first admin is created.
app.post('/bootstrap-admin', async (req, res, next) => {
  try {
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN', isDeleted: false },
    });

    if (existingAdmin) {
      throw new ApiError(409, 'Admin already exists');
    }

    const passwordHash = await bcrypt.hash('admin', 10);
    const user = await prisma.user.create({
      data: {
        employeeId: 'ADMIN-001',
        name: 'System Admin',
        email: 'admin@gmail.com',
        passwordHash,
        role: 'ADMIN',
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return res
      .status(201)
      .json(new ApiResponse(201, 'Admin created successfully', user));
  } catch (err) {
    next(err);
  }
});

app.use("/api", globalRouter);

app.use(errorHandler);

export default app;