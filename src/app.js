import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import globalRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { ApiError } from './utils/response.js';

const app = express();

const allowedOrigins = process.env.FRONTEND_ORIGIN.split(',').map((origin) => origin.trim())

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new ApiError(403, `CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
  res
    .status(200)
    .json({ message: 'MicroERP API Running' });
});

app.use("/api", globalRouter);

app.use(errorHandler);

export default app;