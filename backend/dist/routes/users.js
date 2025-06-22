"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const users_1 = __importDefault(require("../controllers/users"));
const router = express_1.default.Router();
router.get("/me", auth_1.verifyToken, users_1.default.me);
router.get("/me", auth_1.verifyToken, users_1.default.me);
router.put("/change-password", auth_1.verifyToken, users_1.default.changePassword);
router.put("/update-profile", auth_1.verifyToken, users_1.default.update);
router.post("/find", auth_1.verifyToken, users_1.default.findUserByEmail);
router.get("/find/:userId", auth_1.verifyToken, users_1.default.findUserById);
exports.default = router;
