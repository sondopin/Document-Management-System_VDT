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
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
// User schema definition
const userSchema = new mongoose_1.default.Schema({
    email: { type: String, required: true, unique: true }, // User's email address, unique and required
    password: { type: String, required: true }, // User's password, required
    user_name: { type: String }, // User's full name
});
// Pre-save middleware to hash the password before saving the user model
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        // Check if the password is modified before saving the user
        if (this.isModified("password")) {
            // Hash the password using bcrypt with a salt rounds of 8
            this.password = yield bcryptjs_1.default.hash(this.password, 8);
        }
        // Proceed to the next middleware or save operation
        next();
    });
});
// Creating the User model using the userSchema
const User = mongoose_1.default.model("User", userSchema);
exports.default = User;
