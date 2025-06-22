"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
require("dotenv/config");
const mongoose_1 = __importDefault(require("mongoose"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const index_1 = __importDefault(require("./routes/index"));
const path_1 = __importDefault(require("path"));
const body_parser_1 = __importDefault(require("body-parser"));
require("../src/jobs/deleteExpiredTrash");
mongoose_1.default.connect(process.env.MONGODB_CONNECTION_STRING);
if (mongoose_1.default.connection) {
    console.log("Connected to MongoDB");
}
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use(body_parser_1.default.json({ limit: "50mb" })); // Tăng giới hạn JSON
app.use(body_parser_1.default.urlencoded({ limit: "50mb", extended: true }));
// Static middleware để phục vụ các file trong thư mục `public`
app.use("/public", express_1.default.static(path_1.default.join(__dirname, "public")));
(0, index_1.default)(app);
app.listen(7000, () => {
    console.log(`Server is running on port 7000`);
});
