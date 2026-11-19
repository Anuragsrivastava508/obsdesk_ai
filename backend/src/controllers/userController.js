import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendSuccess } from '../utils/response.js';

export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, role, isActive } = req.query;
  const filter = { organization: req.user.organization };
  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, {
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit) || 0,
  });
});

export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, isActive } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw new ApiError(409, 'Email already registered');
  }

  const user = await User.create({
    name,
    email,
    password,
    role,
    isActive: isActive ?? true,
    organization: req.user.organization,
  });

  return sendSuccess(res, 201, { user: user.toJSON() }, 'User created');
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  });
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return sendSuccess(res, 200, { user: user.toJSON() });
});

export const updateUser = asyncHandler(async (req, res) => {
  const allowed = ['name', 'role', 'isActive', 'password'];
  const updates = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const user = await User.findOne({
    _id: req.params.id,
    organization: req.user.organization,
  }).select('+password');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  Object.assign(user, updates);
  await user.save();

  return sendSuccess(res, 200, { user: user.toJSON() }, 'User updated');
});
