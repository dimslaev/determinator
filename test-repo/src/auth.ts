import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "./models/user";
import { logger } from "./utils/logger";

const JWT_SECRET = process.env.JWT_SECRET || "default-secret-key";
const SALT_ROUNDS = 10;

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, SALT_ROUNDS);
    } catch (error) {
      logger.error("Password hashing failed:", error);
      throw new Error("Password processing failed");
    }
  }

  static async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      logger.error("Password verification failed:", error);
      return false;
    }
  }

  static generateToken(user: AuthUser): string {
    try {
      return jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );
    } catch (error) {
      logger.error("Token generation failed:", error);
      throw new Error("Token generation failed");
    }
  }

  static verifyToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      return {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      logger.error("Token verification failed:", error);
      throw new AuthenticationError("Invalid or expired token");
    }
  }

  static async login(
    credentials: LoginCredentials
  ): Promise<{ user: AuthUser; token: string }> {
    const { email, password } = credentials;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.password);
    if (!isPasswordValid) {
      throw new AuthenticationError("Invalid credentials");
    }

    // Generate token
    const authUser: AuthUser = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = this.generateToken(authUser);

    logger.info(`User logged in: ${email}`);
    return { user: authUser, token };
  }

  static async register(
    userData: RegisterData
  ): Promise<{ user: AuthUser; token: string }> {
    const { email, password, firstName, lastName } = userData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AuthenticationError("User already exists with this email");
    }

    // Hash password
    const hashedPassword = await this.hashPassword(password);

    // Create user
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: "user",
      createdAt: new Date(),
    });

    await user.save();

    const authUser: AuthUser = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const token = this.generateToken(authUser);

    logger.info(`New user registered: ${email}`);
    return { user: authUser, token };
  }

  static async refreshToken(oldToken: string): Promise<string> {
    try {
      const user = this.verifyToken(oldToken);
      return this.generateToken(user);
    } catch (error) {
      throw new AuthenticationError("Cannot refresh invalid token");
    }
  }
}
