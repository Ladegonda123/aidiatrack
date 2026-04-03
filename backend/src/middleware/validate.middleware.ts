import { NextFunction, Request, Response } from "express";
import Joi, { ObjectSchema, ValidationError } from "joi";
import { sendError } from "../utils/response";

interface ValidationIssue {
  path: string;
  message: string;
  type: string;
}

const formatValidationErrors = (error: ValidationError): ValidationIssue[] => {
  return error.details.map((detail) => ({
    path: detail.path.join("."),
    message: detail.message,
    type: detail.type,
  }));
};

export const validate = (schema: ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.validate(req.body, {
      abortEarly: false,
      convert: true,
      allowUnknown: false,
      stripUnknown: false,
    });

    if (result.error) {
      sendError(
        res,
        400,
        "Validation failed",
        formatValidationErrors(result.error),
      );
      return;
    }

    req.body = result.value;
    next();
  };
};

export type { ValidationIssue };
