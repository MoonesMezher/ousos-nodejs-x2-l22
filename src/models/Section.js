const mongoose = require("mongoose");

const sectionSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        unique: true
    }
}, { timestamps: true });
const Section = mongoose.model("Section", sectionSchema);

module.exports = Section