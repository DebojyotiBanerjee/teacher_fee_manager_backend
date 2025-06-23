require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/dbConfig');
const routes = require('./routes/index.routes');

// Connect to MongoDB
connectDB();

const app = express();

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