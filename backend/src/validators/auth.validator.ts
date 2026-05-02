import Joi, { ObjectSchema } from "joi";

const roleValues = ["PATIENT", "DOCTOR"] as const;

export const registerSchema: ObjectSchema = Joi.object({
  fullName: Joi.string().trim().min(2).required().messages({
    "string.base": "Full name must be a string.",
    "string.empty": "Full name is required.",
    "string.min": "Full name must be at least 2 characters long.",
    "any.required": "Full name is required.",
  }),
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email is required.",
      "string.email": "Email must be a valid email address.",
      "any.required": "Email is required.",
    }),
  password: Joi.string().min(8).required().messages({
    "string.base": "Password must be a string.",
    "string.empty": "Password is required.",
    "string.min": "Password must be at least 8 characters long.",
    "any.required": "Password is required.",
  }),
  role: Joi.string()
    .valid(...roleValues)
    .default("PATIENT")
    .messages({
      "string.base": "Role must be a string.",
      "any.only": "Role must be either PATIENT or DOCTOR.",
    }),
  phone: Joi.string()
    .pattern(/^\d{10,15}$/)
    .optional()
    .allow("")
    .messages({
      "string.base": "Phone number must be a string of digits.",
      "string.pattern.base": "Phone number must contain 10 to 15 digits.",
    }),
  gender: Joi.string().trim().optional().allow("").messages({
    "string.base": "Gender must be a string.",
  }),
  dateOfBirth: Joi.date().iso().optional().messages({
    "date.base": "Date of birth must be a valid date.",
    "date.format": "Date of birth must be in a valid ISO date format.",
    "date.isoDate": "Date of birth must be in ISO date format.",
  }),
  language: Joi.string().valid("en", "rw").optional().messages({
    "string.base": "Language must be a string.",
    "any.only": "Language must be either 'en' or 'rw'.",
  }),
  fcmToken: Joi.string().trim().optional().messages({
    "string.base": "FCM token must be a string.",
  }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});

export const loginSchema: ObjectSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email is required.",
      "string.email": "Email must be a valid email address.",
      "any.required": "Email is required.",
    }),
  password: Joi.string().required().messages({
    "string.base": "Password must be a string.",
    "string.empty": "Password is required.",
    "any.required": "Password is required.",
  }),
  fcmToken: Joi.string().trim().optional().messages({
    "string.base": "FCM token must be a string.",
  }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});

export const updateProfileSchema: ObjectSchema = Joi.object({
  fullName: Joi.string().min(2).max(100).optional(),
  phone: Joi.string()
    .pattern(/^\+?[0-9]{10,15}$/)
    .optional()
    .allow("", null),
  gender: Joi.string()
    .valid("Male", "Female", "Other")
    .optional()
    .allow("", null),
  dateOfBirth: Joi.date().max("now").optional().allow(null),
  language: Joi.string().valid("en", "rw").optional(),
  weightKg: Joi.number().min(20).max(300).optional().allow(null),
  heightCm: Joi.number().min(50).max(250).optional().allow(null),
  isOnboardingComplete: Joi.boolean().optional(),
  fcmToken: Joi.string().optional().allow("", null),
  reminderEnabled: Joi.boolean().optional(),
  reminderTimes: Joi.array()
    .items(Joi.string().pattern(/^([01]\d|2[0-3]):[0-5]\d$/))
    .min(1)
    .max(5)
    .optional(),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});

export const changePasswordSchema: ObjectSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.base": "Current password must be a string.",
    "string.empty": "Current password is required.",
    "any.required": "Current password is required.",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.base": "New password must be a string.",
    "string.empty": "New password is required.",
    "string.min": "New password must be at least 8 characters long.",
    "any.required": "New password is required.",
  }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});

export const forgotPasswordSchema: ObjectSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email is required.",
      "string.email": "Email must be a valid email address.",
      "any.required": "Email is required.",
    }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});

export const resetPasswordSchema: ObjectSchema = Joi.object({
  email: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.base": "Email must be a string.",
      "string.empty": "Email is required.",
      "string.email": "Email must be a valid email address.",
      "any.required": "Email is required.",
    }),
  otp: Joi.string().length(6).required().messages({
    "string.base": "OTP must be a string.",
    "string.length": "OTP must be 6 digits.",
    "string.empty": "OTP is required.",
    "any.required": "OTP is required.",
  }),
  newPassword: Joi.string().min(8).required().messages({
    "string.base": "New password must be a string.",
    "string.empty": "New password is required.",
    "string.min": "New password must be at least 8 characters long.",
    "any.required": "New password is required.",
  }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});
