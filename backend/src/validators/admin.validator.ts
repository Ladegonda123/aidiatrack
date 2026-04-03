import Joi, { ObjectSchema } from "joi";

export const assignPatientSchema: ObjectSchema = Joi.object({
  patientEmail: Joi.string()
    .trim()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.base": "Patient email must be a string.",
      "string.empty": "Patient email is required.",
      "string.email": "Patient email must be a valid email address.",
      "any.required": "Patient email is required.",
    }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});

export const unassignPatientSchema: ObjectSchema = Joi.object({
  patientId: Joi.number().integer().positive().required().messages({
    "number.base": "Patient ID must be a number.",
    "number.integer": "Patient ID must be an integer.",
    "number.positive": "Patient ID must be a positive number.",
    "any.required": "Patient ID is required.",
  }),
}).messages({
  "object.unknown": "Request contains an unsupported field.",
});
