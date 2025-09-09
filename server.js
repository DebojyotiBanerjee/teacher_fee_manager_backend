require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/dbConfig');
const routes = require('./routes/index.routes');
require('events').EventEmitter.defaultMaxListeners = 15;
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
// Start scheduled cron jobs
require('./utils/cron');

// Import all models to ensure they are registered
require('./models/user.models.js');
require('./models/batch.models.js');
require('./models/detailTeacher.models.js');
require('./models/rating.models.js');
require('./models/detailStudent.model.js');
require('./models/attendance.models.js');

// Import Swagger dependencies
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./docs/swagger-output.json');
const cookieParser = require('cookie-parser');

// Connect to MongoDB
connectDB();

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://teacher-tuition-erp.vercel.app',
      'http://localhost:5173',
      process.env.FRONTEND_URL?.replace(/\/$/, '') // Remove trailing slash if present
    ].filter(Boolean); // Remove any undefined values
    
    // Allow requests with no origin (like mobile apps, curl, Postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || allowedOrigins.some(allowedOrigin => 
      origin.startsWith(allowedOrigin)
    )) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // For legacy browser support
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());  
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/api', routes);

// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

app.get("/", (req, res) =>
  res.json({ message: "Server Running", success: true })
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});