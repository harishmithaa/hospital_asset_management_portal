require('dotenv').config();
const app = require('./app');
const connectDB = async () => {
  try {
    const db = require('./config/db');
    await db();
  } catch (error) {
    console.error(`Database connection issue: ${error.message}`);
  }
};

const startServer = async () => {
  await connectDB();
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'production'} mode on port ${PORT}`);
  });
};

startServer();
