import { Router, Request, Response } from "express";
import { AuthService } from "../auth";
import { validate, userValidation, ValidationError } from "../utils/validation";
import { logger } from "../utils/logger";

const router = Router();

// Register endpoint
router.post("/register", async (req: Request, res: Response) => {
  try {
    const validatedData = validate(userValidation.register, req.body);

    const result = await AuthService.register(validatedData);

    logger.info(`User registered successfully: ${validatedData.email}`);

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    logger.error("Registration failed:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Login endpoint
router.post("/login", async (req: Request, res: Response) => {
  try {
    const validatedData = validate(userValidation.login, req.body);

    const result = await AuthService.login(validatedData);

    logger.info(`User logged in successfully: ${validatedData.email}`);

    res.json({
      success: true,
      message: "Login successful",
      data: {
        user: result.user,
        token: result.token,
      },
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: error.errors,
      });
    }

    logger.error("Login failed:", error);

    res.status(401).json({
      success: false,
      message: "Login failed",
      error: error instanceof Error ? error.message : "Invalid credentials",
    });
  }
});

// Refresh token endpoint
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Token is required",
      });
    }

    const newToken = await AuthService.refreshToken(token);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: { token: newToken },
    });
  } catch (error) {
    logger.error("Token refresh failed:", error);

    res.status(401).json({
      success: false,
      message: "Token refresh failed",
      error: error instanceof Error ? error.message : "Invalid token",
    });
  }
});

// Logout endpoint (client-side token removal)
router.post("/logout", (req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Logout successful",
  });
});

export default router;
