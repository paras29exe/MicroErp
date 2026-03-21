import app from './src/app.js'
import dotenv from 'dotenv'
import { testConnection } from './src/config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

await testConnection();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});