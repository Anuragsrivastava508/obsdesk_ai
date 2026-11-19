import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

const signToken = (user) =>
  jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
      organization: user.organization.toString(),
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password').populate('organization', 'name slug');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }
  if (!user.isActive) {
    throw new ApiError(401, 'Account is inactive');
  }

  const match = await user.comparePassword(password);
  if (!match) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = signToken(user);
  const safeUser = user.toJSON();

  return sendSuccess(
    res,
    200,
    {
      accessToken: token,
      user: safeUser,
    },
    'Login successful'
  );
});

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('organization', 'name slug');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid or inactive user');
  }
  return sendSuccess(res, 200, { user: user.toJSON() }, 'Current user retrieved');
});

/**
 * Stateless logout: client must discard the JWT.
 * Known MVP limitation — tokens remain valid until expiry.
 */
export const logout = asyncHandler(async (_req, res) => {
  return sendSuccess(res, 200, {}, 'Logout successful. Discard the token client-side.');
});
