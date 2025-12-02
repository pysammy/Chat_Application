export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    Number.isInteger(err?.statusCode) && err.statusCode >= 400
      ? err.statusCode
      : 500;

  const message = err?.message || "Internal Server Error";
  console.error("Unhandled error:", err?.stack || message);

  res.status(statusCode).json({ message });
};
