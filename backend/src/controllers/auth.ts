import { Request, Response } from "express";
import { validationResult } from "express-validator";
import User from "../models/user";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const authController = {
  login: async (req: Request, res: Response) => {
    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array() });
      return;
    }

    const { email, password } = req.body;

    // Find user in database
    try {
      let user = await User.findOne({ email });
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
      const isMatch = await bcrypt.compare(password, user.password);
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
      const token = jwt.sign(
        { user_id: user.id},
        process.env.JWT_SECRET_KEY as string,
        {
          expiresIn: "1d",
        }
      );

      // Save token in web browcookie
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 86400000,
      });
      res.status(200).json({token});
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: "Cannot login" });
    }
  },
  register: async (req: Request, res: Response) => {
    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array() });
      return;
    }

    // Find user in database
    try {
      let user = await User.findOne({
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
      user = new User(req.body);
      await user.save();

      // Create token
      const token = jwt.sign(
        { user_id: user.id },
        process.env.JWT_SECRET_KEY as string,
        {
          expiresIn: "1d",
        }
      );

      // Save the token into web browser's cookie for authenticate user
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 86400000,
      });
      res.status(200).send({ token});
      return;
    } catch (error) {
      console.log(error);
      res.status(500).send({ message: "Cannot register" });
    }
  },
  validateToken: (req: Request, res: Response) => {
    res.status(200).send({ user_id: req.user_id });
  },
  logout: (req: Request, res: Response) => {
    res.cookie("auth_token", "", {
      expires: new Date(0),
    });
    res.send();
  },
};

export default authController;
