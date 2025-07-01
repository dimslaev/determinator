import Joi from "joi";

export const userValidation = {
  register: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().min(6).required().messages({
      "string.min": "Password must be at least 6 characters long",
      "any.required": "Password is required",
    }),
    firstName: Joi.string().trim().min(1).max(50).required().messages({
      "string.min": "First name cannot be empty",
      "string.max": "First name cannot exceed 50 characters",
      "any.required": "First name is required",
    }),
    lastName: Joi.string().trim().min(1).max(50).required().messages({
      "string.min": "Last name cannot be empty",
      "string.max": "Last name cannot exceed 50 characters",
      "any.required": "Last name is required",
    }),
  }),

  login: Joi.object({
    email: Joi.string().email().required().messages({
      "string.email": "Please provide a valid email address",
      "any.required": "Email is required",
    }),
    password: Joi.string().required().messages({
      "any.required": "Password is required",
    }),
  }),
};

export const postValidation = {
  create: Joi.object({
    title: Joi.string().trim().min(1).max(200).required().messages({
      "string.min": "Title cannot be empty",
      "string.max": "Title cannot exceed 200 characters",
      "any.required": "Title is required",
    }),
    content: Joi.string().trim().min(1).required().messages({
      "string.min": "Content cannot be empty",
      "any.required": "Content is required",
    }),
    tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
    isPublished: Joi.boolean().optional(),
  }),

  update: Joi.object({
    title: Joi.string().trim().min(1).max(200).optional(),
    content: Joi.string().trim().min(1).optional(),
    tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
    isPublished: Joi.boolean().optional(),
  }),

  comment: Joi.object({
    content: Joi.string().trim().min(1).max(500).required().messages({
      "string.min": "Comment cannot be empty",
      "string.max": "Comment cannot exceed 500 characters",
      "any.required": "Comment content is required",
    }),
  }),
};

export const validate = (schema: Joi.ObjectSchema, data: any) => {
  const { error, value } = schema.validate(data, { abortEarly: false });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    throw new ValidationError(errorMessages);
  }

  return value;
};

export class ValidationError extends Error {
  public errors: string[];

  constructor(errors: string[]) {
    super("Validation failed");
    this.name = "ValidationError";
    this.errors = errors;
  }
}
