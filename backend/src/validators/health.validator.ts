import Joi, { ObjectSchema } from "joi";

const activityLevelValues = ["NONE", "LOW", "MODERATE", "HIGH"] as const;

export const healthRecordSchema: ObjectSchema = Joi.object({
  bloodGlucose: Joi.number().min(20).max(600).required().messages({
    "number.base": "Blood glucose must be a number.",
    "number.empty": "Blood glucose is required.",
    "number.min": "Blood glucose must be at least 20.",
    "number.max": "Blood glucose must not exceed 600.",
    "any.required": "Blood glucose is required.",
  }),
  weightKg: Joi.number().positive().optional().messages({
    "number.base": "Weight must be a number.",
    "number.positive": "Weight must be greater than 0.",
  }),
  mealGi: Joi.number().integer().min(0).optional().messages({
    "number.base": "Meal GI must be a number.",
    "number.integer": "Meal GI must be a whole number.",
    "number.min": "Meal GI must not be negative.",
  }),
  mealCalories: Joi.number().integer().min(0).optional().messages({
    "number.base": "Meal calories must be a number.",
    "number.integer": "Meal calories must be a whole number.",
    "number.min": "Meal calories must not be negative.",
  }),
  bloodPressure: Joi.string()
    .pattern(/^\d{2,3}\/\d{2,3}$/)
    .optional()
    .messages({
      "string.base": "Blood pressure must be a string.",
      "string.pattern.base": "Blood pressure must be in the format 120/80.",
    }),
  mealDesc: Joi.string().trim().optional().allow("").messages({
    "string.base": "Meal description must be a string.",
  }),
  calories: Joi.number().integer().min(0).optional().messages({
    "number.base": "Calories must be a number.",
    "number.integer": "Calories must be a whole number.",
    "number.min": "Calories must not be negative.",
  }),
  activityLevel: Joi.string()
    .valid(...activityLevelValues)
    .optional()
    .messages({
      "string.base": "Activity level must be a string.",
      "any.only": "Activity level must be one of NONE, LOW, MODERATE, or HIGH.",
    }),
  insulinDose: Joi.number().min(0).optional().messages({
    "number.base": "Insulin dose must be a number.",
    "number.min": "Insulin dose must not be negative.",
  }),
  hba1c: Joi.number().min(0).max(20).optional().messages({
    "number.base": "HbA1c must be a number.",
    "number.min": "HbA1c cannot be negative.",
    "number.max": "HbA1c must not exceed 20.",
  }),
  notes: Joi.string().trim().optional().allow("").messages({
    "string.base": "Notes must be a string.",
  }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});
