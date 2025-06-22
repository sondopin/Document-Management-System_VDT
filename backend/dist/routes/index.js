"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const users_1 = __importDefault(require("./users"));
const auth_1 = __importDefault(require("./auth"));
const file_1 = __importDefault(require("./file"));
const folders_1 = __importDefault(require("./folders"));
const auth_2 = require("../middleware/auth");
const router = (app) => {
    app.use("/auth", auth_1.default);
    app.use("/users", users_1.default);
    app.use("/files", auth_2.verifyToken, file_1.default); // Ensure file routes are protected by the verifyToken middleware
    app.use("/folders", auth_2.verifyToken, folders_1.default); // Use folderRoutes for folder-related endpoints
};
exports.default = router;
