import express, { Request, Response } from "express";
import { check, validationResult } from "express-validator";
import User from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth";
import authController from "../controllers/auth";

const router = express.Router();

router.post("/login", authController.login);

router.post("/register", authController.register);

router.get("/validate-token", verifyToken, authController.validateToken);

router.post("/logout", authController.logout);

export default router;
