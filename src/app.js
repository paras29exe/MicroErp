import express from 'express';
import cors from 'cors';

import productRoutes from './routes/productRoutes.js';
import customerRoutes from './routes/customerRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/products', productRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/vendors', vendorRoutes);

app.get('/', (req, res) => {
  res.send('MicroERP API Running');
});

export default app;