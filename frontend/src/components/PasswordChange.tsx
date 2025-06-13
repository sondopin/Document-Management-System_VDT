import { useForm } from "react-hook-form"; 
import * as apiClient from "../apis/user.api"; 
import { ChangePasswordParams } from "../types/user.type";
import { Button } from "antd"; 
import { useNavigate } from "react-router-dom"; 


const PasswordChange = () => {
  const navigate = useNavigate(); 

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ChangePasswordParams>(); // Using useForm hook to manage form data and validation

  const onSubmit = async (data: ChangePasswordParams) => {
    try {
      await apiClient.changePassword(data); 
      navigate("/"); 
    } catch (error: any) {
      console.error(error);
    }
  };

  return (
    <div
      className="bg-white shadow sm:rounded-lg flex flex-col w-full"
      style={{ fontFamily: "Montserrat" }}
    >
      <div className="px-4 py-5 sm:px-6">
        <h3 className="text-xl leading-6 font-medium text-gray-900">
          Change Password
        </h3>
        <p className="mt-1 max-w-2xl text-gray-500">
          Keep your password secure and up to date
        </p>
      </div>
      <div className="border-t border-gray-200">
        {/* Current Password Input */}
        <div className="flex flex-row px-4 py-4 sm:px-6">
          <label className="text-gray-700 text-sm font-bold min-w-36 mt-1">
            Current Password
          </label>
          <div className="flex flex-col w-full">
            <input
              className="border border-mint rounded w-full py-1 px-2 font-normal"
              type="password"
              {...register("currentPassword", {
                required: "This field is required", // Validation message if field is empty
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters", 
                },
              })}
            />
            {errors.currentPassword && (
              <span className="text-red-500 font-normal mt-1">
                {errors.currentPassword.message} 
              </span>
            )}
          </div>
        </div>

        {/* New Password Input */}
        <div className="flex flex-row px-4 py-4 sm:px-6">
          <label className="text-gray-700 text-sm font-bold min-w-36 mt-1">
            New Password
          </label>
          <div className="flex flex-col w-full">
            <input
              type="password"
              className="border border-mint rounded w-full py-1 px-2 font-normal"
              {...register("newPassword", {
                required: "This field is required", // Validation message if field is empty
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters", 
                },
              })}
            />
            {errors.newPassword && (
              <span className="text-red-500 font-normal mt-1">
                {errors.newPassword.message} 
              </span>
            )}
          </div>
        </div>

        {/* Confirm Password Input */}
        <div className="flex flex-row px-4 py-4 sm:px-6">
          <label className="text-gray-700 text-sm font-bold min-w-36 mt-1">
            Confirm Password
          </label>
          <div className="flex flex-col w-full">
            <input
              type="password"
              className="border border-mint rounded w-full py-1 px-2 font-normal"
              {...register("confirmNewPassword", {
                required: "This field is required", // Validation message if field is empty
                validate: (value) =>
                  value === watch("newPassword") ||
                  "The passwords do not match", // Validation to ensure passwords match
              })}
            />
            {errors.confirmNewPassword && (
              <span className="text-red-500 font-normal mt-1">
                {errors.confirmNewPassword.message} 
              </span>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end px-4 py-3 bg-gray-50 text-right sm:px-6">
          <Button
            type="primary"
            className="bg-mint text-black font-semibold"
            onClick={handleSubmit(onSubmit)} 
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PasswordChange;
