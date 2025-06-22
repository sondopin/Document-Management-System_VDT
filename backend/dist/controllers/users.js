"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const user_1 = __importDefault(require("../models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const userController = {
    // Get current user's profile, excluding the password
    me: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user_id = req.user_id;
        try {
            const user = yield user_1.default.findById(user_id).select("-password"); // Find user by ID, excluding password
            if (!user) {
                res.status(400).json({ message: "User not found" });
                return;
            }
            res.json(user);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: "Cannot get user profile" });
        }
    }),
    // Update user's profile with the provided data
    update: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user_id = req.user_id;
        const updates = req.body;
        try {
            const user = yield user_1.default.findByIdAndUpdate(user_id, updates, {
                new: true,
            });
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.json(user);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: "Cannot update user profile" });
        }
    }),
    // Change user's password
    changePassword: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const user_id = req.user_id;
        const { currentPassword, newPassword, confirmNewPassword } = req.body;
        // Ensure the new passwords match
        if (newPassword !== confirmNewPassword) {
            res.status(400).json({ message: "New passwords do not match" });
            return;
        }
        try {
            const user = yield user_1.default.findById(user_id); // Find user by ID
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            // Compare the current password with the user's stored password
            const isMatch = yield bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                res.status(400).json({ message: "Current password is incorrect" });
                return;
            }
            user.password = newPassword;
            yield user.save();
            res.json({ message: "Password changed successfully" });
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: "Cannot change password" });
        }
    }),
    findUserByEmail: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email } = req.body; // Get email from request body
        try {
            const users = yield user_1.default.find({ email: { $regex: `^${email}`, $options: 'i' } });
            if (!users || users.length === 0) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.json(users);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: "Cannot find user by email" });
        }
    }),
    findUserById: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { userId } = req.params; // Get userId from request parameters
        try {
            const user = yield user_1.default.findById(userId).select("-password"); // Find user by ID, excluding password
            if (!user) {
                res.status(404).json({ message: "User not found" });
                return;
            }
            res.json(user);
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: "Cannot find user by ID" });
        }
    }),
};
exports.default = userController;
