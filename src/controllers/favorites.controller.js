const Favorite = require("../models/Favorite");
const User = require("../models/User");
const Car = require("../models/Car");

class FavoritesController {
    // API (علاقة M-M): إضافة سيارة إلى مفضلة مستخدم
    addToFavorites = async (req, res) => {
        try {
            const { userId, carId } = req.body;

            if (!userId || !carId) {
                return res.status(400).json({ message: "userId and carId are required" });
            }

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const car = await Car.findById(carId);
            if (!car) {
                return res.status(404).json({ message: "Car not found" });
            }

            // منع التكرار: التأكد من عدم إضافة نفس السيارة للمفضلة مسبقاً
            const existing = await Favorite.findOne({ userId, carId });
            if (existing) {
                return res.status(400).json({ message: "Car already in user favorites" });
            }

            const favorite = await Favorite.create({ userId, carId });
            res.status(201).json({
                message: "Car added to favorites successfully",
                favorite
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    // API (علاقة M-M): جلب جميع السيارات المفضلة لمستخدم معين
    getUserFavorites = async (req, res) => {
        try {
            const { userId } = req.params;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const favorites = await Favorite.find({ userId }).populate({
                path: "carId",
                populate: { path: "sectionId" }
            });

            res.status(200).json({
                userId,
                userName: user.name,
                count: favorites.length,
                favorites: favorites.map(fav => fav.carId)
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };
}

module.exports = new FavoritesController();
