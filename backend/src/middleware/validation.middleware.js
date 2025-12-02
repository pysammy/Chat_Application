import mongoose from "mongoose";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const respondValidationError = (res, message) =>
  res.status(400).json({ message });

export const validateSignup = (req, res, next) => {
  const { fullName, email, password } = req.body;
  if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
    return respondValidationError(res, "Full name is required");
  }
  if (!email || !emailRegex.test(email)) {
    return respondValidationError(res, "Valid email is required");
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return respondValidationError(
      res,
      "Password is required and must be at least 6 characters"
    );
  }
  next();
};

export const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !emailRegex.test(email)) {
    return respondValidationError(res, "Valid email is required");
  }
  if (!password) {
    return respondValidationError(res, "Password is required");
  }
  next();
};

export const validateUpdateProfile = (req, res, next) => {
  const { profilePic } = req.body;
  if (!profilePic || typeof profilePic !== "string" || !profilePic.trim()) {
    return respondValidationError(res, "Profile pic is required");
  }
  next();
};

export const validateSendMessage = (req, res, next) => {
  const { text, image } = req.body;
  if ((!text || !text.trim()) && !image) {
    return respondValidationError(
      res,
      "Message text or image is required to send a message"
    );
  }
  next();
};

export const validateObjectIdParam = (paramName = "id") => {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return respondValidationError(res, "Invalid identifier provided");
    }
    next();
  };
};
