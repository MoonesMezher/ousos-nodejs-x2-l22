const mongoose = require("mongoose");

const carSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        required: true
    },
    colors: {
        type: [String],
        default: []
    },
    sectionId: {
        type: mongoose.Types.ObjectId,
        ref: "Section"
    }
}, { timestamps: true });
const Car = mongoose.model("Car", carSchema);

module.exports = Car