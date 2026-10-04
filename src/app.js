require("dotenv").config();
const express = require("express");
const path = require("path");
const app = express();

const morgan = require("morgan");
const connectDB = require("./utils/connectDb");

// CORS Middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

app.use(express.json());
app.use(morgan("dev"));

// Serve Frontend static files
app.use(express.static(path.join(__dirname, "../public")));

app.use("/api/v1/users", require("./routes/user.routes"));
app.use("/api/v1/sections", require("./routes/section.routes"));
app.use("/api/v1/cars", require("./routes/car.routes"));
app.use("/api/v1/favorites", require("./routes/favorite.routes"));

connectDB(app);