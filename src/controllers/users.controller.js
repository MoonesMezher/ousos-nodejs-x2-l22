const User = require("../models/User");
const Car = require("../models/Car");

class UsersController {
    getAll = async (req, res) => {
        try {
            const users = await User.find().populate("carId");
            res.status(200).json({ users });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    create = async (req, res) => {
        try {
            const { name, email, phone, password } = req.body;
            if (!name || !email || !phone || !password) {
                return res.status(400).json({ message: "All fields are required" });
            }
            const user = await User.create({ name, email, phone, password });
            res.status(201).json({ message: "User created successfully", user });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    // API (علاقة 1-1): حجز سيارة لمستخدم مع فرض قيود علاقة 1-1
    bookCar = async (req, res) => {
        try {
            const { userId, carId } = req.params;

            const user = await User.findById(userId);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            // التحقق من أن المستخدم لم يحجز سيارة بالفعل
            if (user.carId) {
                return res.status(400).json({ message: "User already booked a car" });
            }

            const car = await Car.findById(carId);
            if (!car) {
                return res.status(404).json({ message: "Car not found" });
            }

            // التحقق من أن السيارة ليست محجوزة لمستخدم آخر
            const carBooked = await User.findOne({ carId });
            if (carBooked) {
                return res.status(400).json({ message: "Car is already booked by another user" });
            }

            user.carId = carId;
            await user.save();

            const populatedUser = await User.findById(userId).populate("carId");
            res.status(200).json({
                message: "Car booked successfully",
                user: populatedUser
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };

    // جلب بيانات الحجز للمستخدم
    getBooking = async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await User.findById(userId).populate("carId");
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            res.status(200).json({
                userId: user._id,
                name: user.name,
                bookedCar: user.carId || null
            });
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };
}

module.exports = new UsersController();