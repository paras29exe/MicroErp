import express from 'express';
import cors from 'cors';
import globalRouter from './routes/index.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('MicroERP API Running');
});

app.use("/api", globalRouter);

export default app;