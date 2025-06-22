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
const express_validator_1 = require("express-validator");
const user_1 = __importDefault(require("../models/user"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authController = {
    login: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // Check for errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ message: errors.array() });
            return;
        }
        const { email, password } = req.body;
        // Find user in database
        try {
            let user = yield user_1.default.findOne({ email });
            if (!user) {
                res.status(400).json({
                    message: "Invalid credentials",
                    data: {
                        email: "Incorrect username or password",
                        password: "Incorrect username or password",
                    },
                });
                return;
            }
            // Check if password is match with the hashed password
            const isMatch = yield bcryptjs_1.default.compare(password, user.password);
            if (!isMatch) {
                res.status(400).json({
                    message: "Invalid credentials",
                    data: {
                        email: "Incorrect username or password",
                        password: "Incorrect username or password",
                    },
                });
                return;
            }
            // Create token with id and role
            const token = jsonwebtoken_1.default.sign({ user_id: user.id }, process.env.JWT_SECRET_KEY, {
                expiresIn: "1d",
            });
            // Save token in web browcookie
            res.cookie("auth_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 86400000,
            });
            res.status(200).json({ token });
        }
        catch (error) {
            console.log(error);
            res.status(500).json({ message: "Cannot login" });
        }
    }),
    register: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        // Check for errors
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            res.status(400).json({ message: errors.array() });
            return;
        }
        // Find user in database
        try {
            let user = yield user_1.default.findOne({
                email: req.body.email,
            });
            if (user) {
                res.status(400).json({
                    message: "Invalid credentials",
                    data: {
                        email: "Email already exists",
                    },
                });
                return;
            }
            // Create new user
            user = new user_1.default(req.body);
            yield user.save();
            // Create token
            const token = jsonwebtoken_1.default.sign({ user_id: user.id }, process.env.JWT_SECRET_KEY, {
                expiresIn: "1d",
            });
            // Save the token into web browser's cookie for authenticate user
            res.cookie("auth_token", token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                maxAge: 86400000,
            });
            res.status(200).send({ token });
            return;
        }
        catch (error) {
            console.log(error);
            res.status(500).send({ message: "Cannot register" });
        }
    }),
    validateToken: (req, res) => {
        res.status(200).send({ user_id: req.user_id });
    },
    logout: (req, res) => {
        res.cookie("auth_token", "", {
            expires: new Date(0),
        });
        res.send();
    },
};
exports.default = authController;
