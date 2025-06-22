"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const auth_2 = __importDefault(require("../controllers/auth"));
const router = express_1.default.Router();
router.post("/login", auth_2.default.login);
router.post("/register", auth_2.default.register);
router.get("/validate-token", auth_1.verifyToken, auth_2.default.validateToken);
router.post("/logout", auth_2.default.logout);
exports.default = router;
