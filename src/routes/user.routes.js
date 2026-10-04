const express = require("express");
const usersController = require("../controllers/users.controller");
const router = express.Router();

router.get("/", usersController.getAll);
router.post("/", usersController.create);

// API (علاقة 1-1): حجز سيارة لمستخدم
router.post("/:userId/book/:carId", usersController.bookCar);

// جلب تفاصيل حجز المستخدم
router.get("/:userId/booking", usersController.getBooking);

module.exports = router;