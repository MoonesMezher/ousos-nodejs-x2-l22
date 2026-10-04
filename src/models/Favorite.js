const mongoose = require("mongoose");

const favoriteSchema = new mongoose.Schema({
    carId: {
        type: mongoose.Types.ObjectId,
        ref: "Car",
        required: true
    },
    userId: {
        type: mongoose.Types.ObjectId,
        ref: "User",
        required: true
    }
}, { timestamps: true });
const Favorite = mongoose.model("Favorite", favoriteSchema);

module.exports = Favorite;