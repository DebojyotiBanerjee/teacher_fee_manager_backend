require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/dbConfig');
const routes = require('./routes/index.routes');
require('events').EventEmitter.defaultMaxListeners = 15;
// Import Swagger dependencies
const swaggerUi = require('swagger-ui-express');
const swaggerFile = require('./docs/swagger-output.json');
const cookieParser = require('cookie-parser');

// Connect to MongoDB
connectDB();

const app = express();

const corsOptions = {
  origin: "http://localhost:5173", // Frontend URL
  credentials: true, // Allow cookies and credentials
  
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