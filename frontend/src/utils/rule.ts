import * as yup from "yup";

export const registerSchema = yup.object({
  email: yup.string().email("Email is invalid").required("Email is required"),
  password: yup
    .string()
    .required("Password is required")
    .min(6, "Minimum 6 characters")
    .max(160, "Maximum 160 characters"),
  confirm_password: yup
    .string()
    .required("Confirm Password is required")
    .min(6, "Minimum 6 characters")
    .max(160, "Maximum 160 characters")
    .oneOf([yup.ref("password")], "Confirm Password must match Password"),
});

export const loginSchema = registerSchema.omit(["confirm_password"]);
export type Schema = yup.InferType<typeof registerSchema>;
