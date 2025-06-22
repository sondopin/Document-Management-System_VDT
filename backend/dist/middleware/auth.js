"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Middleware to verify the JWT token in the request headers
const verifyToken = (req, res, next) => {
    var _a;
    const token = ((_a = req.headers["authorization"]) === null || _a === void 0 ? void 0 : _a.replace("Bearer ", "")) || ""; // Extract the token from the authorization header
    if (!token) {
        res.status(401).json({ message: "unauthorized" });
        return; // If no token is provided, respond with unauthorized status
    }
    try {
        // Verify the token using the JWT secret key
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET_KEY);
        req.user_id = decoded.user_id;
        next(); // Proceed to the next middleware or route handler
    }
    catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
};
exports.verifyToken = verifyToken;
