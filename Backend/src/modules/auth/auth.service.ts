import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { User, IUser } from '../users/user.model';
import { AppError } from '../../middleware/errorHandler';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../utils/jwt';

// Helper for timing safe token comparison
const timingSafeEqual = (a: string, b: string) => {
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
};

export const register = async (userData: any) => {
  const existingUser = await User.findOne({ email: userData.email });
  if (existingUser) {
    const error: AppError = new Error('Email already in use');
    error.statusCode = 409;
    error.code = 'CONFLICT';
    throw error;
  }

  const user = await User.create(userData);
  const userJson = user.toJSON();
  delete userJson.password;
  delete userJson.refreshTokens;
  
  return userJson;
};

export const login = async (credentials: any) => {
  const { email, password } = credentials;
  const user = await User.findOne({ email }).select('+password');

  if (!user || !user.isActive) {
    const error: AppError = new Error('Invalid credentials');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  // Account lockout check
  if (user.lockUntil && user.lockUntil > new Date()) {
    const error: AppError = new Error('Account locked. Try again later.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
    }
    await user.save();
    const error: AppError = new Error('Invalid credentials');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    throw error;
  }

  // Reset login attempts
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  const accessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
  const refreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });

  // Store hashed refresh token
  const hashedToken = await bcrypt.hash(refreshToken, 10);
  user.refreshTokens!.push({ token: hashedToken, createdAt: new Date() });
  
  // Keep only last 5 sessions
  if (user.refreshTokens!.length > 5) {
    user.refreshTokens!.shift();
  }

  await user.save();

  return { user: { _id: user._id, name: user.name, email: user.email, role: user.role }, accessToken, refreshToken };
};

export const refresh = async (oldRefreshToken: string) => {
  try {
    const decoded = verifyRefreshToken(oldRefreshToken);
    const user = await User.findById(decoded.userId);

    if (!user || !user.isActive) {
      const error: AppError = new Error('User not found or inactive');
      error.statusCode = 401;
      error.code = 'REFRESH_TOKEN_INVALID';
      throw error;
    }

    // Find and verify the token in user's list
    let tokenIndex = -1;
    for (let i = 0; i < user.refreshTokens!.length; i++) {
      const isMatch = await bcrypt.compare(oldRefreshToken, user.refreshTokens![i].token);
      if (isMatch) {
        tokenIndex = i;
        break;
      }
    }

    // Token reuse detection (breach signal)
    if (tokenIndex === -1) {
      user.refreshTokens = []; // Revoke all
      await user.save();
      const error: AppError = new Error('Session expired or breached');
      error.statusCode = 401;
      error.code = 'REFRESH_TOKEN_INVALID';
      throw error;
    }

    // Rotate refresh token
    const newAccessToken = signAccessToken({ userId: user._id.toString(), role: user.role });
    const newRefreshToken = signRefreshToken({ userId: user._id.toString(), role: user.role });
    const hashedNewToken = await bcrypt.hash(newRefreshToken, 10);

    user.refreshTokens![tokenIndex] = { token: hashedNewToken, createdAt: new Date() };
    await user.save();

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error: any) {
    const err: AppError = new Error('Invalid refresh token');
    err.statusCode = 401;
    err.code = 'REFRESH_TOKEN_INVALID';
    throw err;
  }
};

export const logout = async (userId: string, refreshToken: string) => {
  const user = await User.findById(userId);
  if (user) {
    // Filter out the current refresh token
    const remainingTokens = [];
    for (const rt of user.refreshTokens!) {
      const isMatch = await bcrypt.compare(refreshToken, rt.token);
      if (!isMatch) {
        remainingTokens.push(rt);
      }
    }
    user.refreshTokens = remainingTokens;
    await user.save();
  }
};
