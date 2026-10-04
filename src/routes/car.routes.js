const express = require("express");
const carsController = require("../controllers/cars.controller");
const router = express.Router();

// API (علاقة 1-M): إنشاء سيارة وربطها بقسم
router.post("/", carsController.create);
router.get("/", carsController.getAll);
router.get("/:id", carsController.getById);

module.exports = router;
