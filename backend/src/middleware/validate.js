import { ApiError } from '../utils/ApiError.js';

export const validate =
  (schema, source = 'body') =>
  (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      next();
    } catch (err) {
      next(err);
    }
  };

export const validateObjectIdParam = (paramName = 'id') => (req, res, next) => {
  const value = req.params[paramName];
  if (!/^[a-fA-F0-9]{24}$/.test(value)) {
    return next(
      new ApiError(400, `Invalid ObjectId for ${paramName}`, [
        { path: paramName, message: 'Must be a valid MongoDB ObjectId' },
      ])
    );
  }
  return next();
};
