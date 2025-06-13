import mongoose from "mongoose";
import { UserType } from "./types";
import bcrypt from "bcryptjs";

// User schema definition
const userSchema = new mongoose.Schema<UserType>({
  email: { type: String, required: true, unique: true }, // User's email address, unique and required
  password: { type: String, required: true }, // User's password, required
  user_name: { type: String }, // User's full name
  last_modified: { type: Date, default: Date.now }, // Timestamp when the user was created, default is current date
  last_login: { type: Date }, // Timestamp of the user's last login
  is_active: { type: Boolean, default: true }, // Indicates if the user account is active, default is true
});

// Pre-save middleware to hash the password before saving the user model
userSchema.pre("save", async function (next) {
  // Check if the password is modified before saving the user
  if (this.isModified("password")) {
    // Hash the password using bcrypt with a salt rounds of 8
    this.password = await bcrypt.hash(this.password, 8);
  }
  // Proceed to the next middleware or save operation
  next();
});

// Creating the User model using the userSchema
const User = mongoose.model<UserType>("User", userSchema);

export default User;
