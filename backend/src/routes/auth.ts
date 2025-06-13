import express, { Request, Response } from "express";
import { check, validationResult } from "express-validator";
import User from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { verifyToken } from "../middleware/auth";
import authController from "../controllers/auth";

const router = express.Router();

/**
 * @route POST /api/auth/login
 * @desc Login a user and assign a JWT token (with id and role)
 * @access Public
 * @param {Request} req - The request object containing user credentials
 * @param {Response} res - The response object to send data back
 */
router.post("/login", authController.login);

router.post("/register", authController.register);

router.get("/validate-token", verifyToken, authController.validateToken);

router.post("/logout", authController.logout);

export default router;
