const express = require("express");
const sectionsController = require("../controllers/sections.controller");
const router = express.Router();

router.post("/", sectionsController.create);
router.get("/", sectionsController.getAll);

// API (علاقة 1-M): جلب جميع السيارات التابعة لقسم معين
router.get("/:sectionId/cars", sectionsController.getSectionCars);

module.exports = router;
