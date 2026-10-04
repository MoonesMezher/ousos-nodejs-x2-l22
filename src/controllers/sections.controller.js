const Section = require("../models/Section");
const Car = require("../models/Car");

class SectionsController {
    create = async (req, res) => {
        try {
            const { title } = req.body;
            if (!title) {
                return res.status(400).json({ message: "Title is required" });
            }
            const section = await Section.create({ title });
            res.status(201).json({ message: "Section created successfully", section });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    getAll = async (req, res) => {
        try {
            const sections = await Section.find();
            res.status(200).json({ sections });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    // API (علاقة 1-M): جلب جميع السيارات التابعة لقسم معين
    getSectionCars = async (req, res) => {
        try {
            const { sectionId } = req.params;
            const section = await Section.findById(sectionId);
            if (!section) {
                return res.status(404).json({ message: "Section not found" });
            }

            const cars = await Car.find({ sectionId });
            res.status(200).json({
                section,
                count: cars.length,
                cars
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };
}

module.exports = new SectionsController();
