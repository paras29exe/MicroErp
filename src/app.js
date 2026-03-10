import express from 'express';
import cors from 'cors';
import globalRouter from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MicroERP API Running');
});

app.use("/api", globalRouter);

app.use(errorHandler);

export default app;