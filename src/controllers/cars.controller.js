const Car = require("../models/Car");
const Section = require("../models/Section");

class CarsController {
    // API (علاقة 1-M): إنشاء سيارة وربطها بقسم معين
    create = async (req, res) => {
        try {
            const { title, model, price, colors, sectionId } = req.body;

            if (!title || !model || !price || !sectionId) {
                return res.status(400).json({ message: "title, model, price, and sectionId are required" });
            }

            const section = await Section.findById(sectionId);
            if (!section) {
                return res.status(404).json({ message: "Section not found" });
            }

            const car = await Car.create({
                title,
                model,
                price,
                colors: colors || [],
                sectionId
            });

            res.status(201).json({
                message: "Car created and associated with section successfully",
                car
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    getAll = async (req, res) => {
        try {
            const cars = await Car.find().populate("sectionId"); 
            res.status(200).json({ cars });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    getById = async (req, res) => {
        try {
            const car = await Car.findById(req.params.id).populate("sectionId");
            if (!car) {
                return res.status(404).json({ message: "Car not found" });
            }
            res.status(200).json({ car });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };
}

module.exports = new CarsController();
