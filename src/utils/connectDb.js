const mongoose = require("mongoose");

const MONGODB_URL = process.env.MONGODB_URL;
const PORT = process.env.PORT;

async function connectDB(app) {
    return mongoose.connect(MONGODB_URL)
        .then(() => {
            console.log("Connected To DB Successfully");
            
            app.listen(PORT, () => {
                console.log(`Server is Running on: http://localhost:${PORT}`);
            })
    });
}

module.exports = connectDB