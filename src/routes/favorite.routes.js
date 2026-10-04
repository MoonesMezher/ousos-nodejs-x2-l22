const express = require("express");
const favoritesController = require("../controllers/favorites.controller");
const router = express.Router();

// API (علاقة M-M): إضافة سيارة إلى المفضلة
router.post("/", favoritesController.addToFavorites);

// API (علاقة M-M): جلب جميع السيارات المفضلة لمستخدم معين
router.get("/user/:userId", favoritesController.getUserFavorites);

module.exports = router;
