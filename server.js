import 'dotenv/config'
import app from './src/app.js'
import { testConnection } from './src/config/db.js';

const PORT = process.env.PORT || 5000;

await testConnection();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});