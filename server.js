require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/dbConfig');
const routes = require('./routes/index.routes');
require('events').EventEmitter.defaultMaxListeners = 15;
// Import Swagger dependencies
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('./docs/swagger-definition');

// Connect to MongoDB
connectDB();

const app = express();

// Swagger setup
const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: ['./routes/*.js','./models/*.js'], // Path to the API docs
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Middleware
app.use(cors());
app.use(bodyParser.json());  
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/api', routes);

app.get("/", (req, res) =>
  res.json({ message: "Server Running", success: true })
);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});