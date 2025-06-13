import React, { useContext } from "react";
import InputField from "../components/InputFeild";
import { registerSchema, Schema } from "../utils/rule";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useMutation } from "@tanstack/react-query";
import { registerAccount } from "../apis/auth.api";
import { isAxiosUnprocessableEntity } from "../utils/utils";
import { ErrorResponse } from "../types/utils.type";
import { Link, useNavigate } from "react-router-dom";
import { AppContext } from "../context/app.context";

type RegisterForm = Schema;

const RegisterPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterForm>({
    resolver: yupResolver(registerSchema),
  });

  const navigate = useNavigate();
  const { setIsAuthenticated } = useContext(AppContext);

  const registerMutation = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      registerAccount(body),
  });

  const onSubmit = handleSubmit((data) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        console.log("Success Login");
        setIsAuthenticated(true);
        navigate("/");
      },
      onError: (error) => {
        if (isAxiosUnprocessableEntity<ErrorResponse<RegisterForm>>(error)) {
          const formError = error.response?.data?.data;
          console.log(error);

          if (formError) {
            Object.keys(formError).forEach((key) => {
              setError(key as keyof RegisterForm, {
                type: "server",
                message: formError[key as keyof RegisterForm],
              });
            });
          }
        }
      },
    });
  });

  return (
    <main className="bg-white flex min-w-[320px] items-start overflow-hidden justify-start flex-wrap mx-24 md:p-[100px_20px] scale-[0.85]">
      <div className="rounded-[14px] shadow-lg flex min-w-[240px] w-full justify-center flex-wrap flex-1 basis-0 items-stretch md:max-w-full">
        <section className="rounded-[14px_0_0_14px] flex min-w-[320px] flex-col overflow-hidden flex-1 basis-[60px] p-[217px_0_132px] relative md:max-w-full md:p-[100px_0]">
          <img
            className="w-full h-full absolute top-0 left-0 z-[1]"
            src="./background.jpg"
            alt="Background"
          />
        </section>
        <section className="rounded-[0_14px_14px_0] bg-[rgba(97,168,250,0.2)] flex min-w-[400px] min-h-[814px] flex-col overflow-hidden tracking-[0.96px] justify-between flex-1 basis-0 text-[16px] md:max-w-full md:p-[0_20px]">
          <img
            loading="lazy"
            src="./logo.png"
            alt="Company Logo"
            className="object-contain w-[100px] max-w-[300px] mt-2"
          />
          <div className="text-[#223a60] font-bold leading-[40px] mt-[50px] md:max-w-full md:mt-[40px]">
            <h1 className="text-[48px] text-[#223a60]">Create Account</h1>
          </div>
          <form onSubmit={onSubmit} className="mb-10 flex flex-col">
            <div className="mb-8">
              <InputField
                name="email"
                type="text"
                placeholder="Email"
                iconSrc="https://cdn.builder.io/api/v1/image/assets/f8ff8e6c001546d0b8b7d8599eb812e4/89d1af211486f8a9cd21fd16209f0d9061374f9e65e163a37e7d9fc23b74a0e0?apiKey=f8ff8e6c001546d0b8b7d8599eb812e4&"
                iconAlt="Email icon"
                register={register}
                error={errors.email?.message}
              />
            </div>
            <div className="mb-8">
              <InputField
                name="password"
                type="password"
                placeholder="Password"
                iconSrc="https://cdn.builder.io/api/v1/image/assets/f8ff8e6c001546d0b8b7d8599eb812e4/4f99d8f408629bd8675a6a08d50091c811acac04e457a14f936a41b2fdfc8e5a?apiKey=f8ff8e6c001546d0b8b7d8599eb812e4&"
                iconAlt="Password icon"
                register={register}
                error={errors.password?.message}
              />
            </div>
            <InputField
              name="confirm_password"
              type="password"
              placeholder="Confirm Password"
              iconSrc="https://cdn.builder.io/api/v1/image/assets/f8ff8e6c001546d0b8b7d8599eb812e4/4f99d8f408629bd8675a6a08d50091c811acac04e457a14f936a41b2fdfc8e5a?apiKey=f8ff8e6c001546d0b8b7d8599eb812e4&"
              iconAlt="Password icon"
              register={register}
              error={errors.confirm_password?.message}
            />
            <button
              type="submit"
              className="w-1/3 mx-auto mb-3 rounded-[14px] bg-[#223a60] shadow-lg min-h-[44px] gap-[10px] text-white font-medium text-center leading-[40px] px-5 mt-[40px] lg:whitespace-nowrap lg:mt-[50px]"
            >
              Register
            </button>
            <Link to="/login" className="text-center">
              <p className="text-[#223a60] font-normal leading-[40px] self-stretch flex-1 basis-[40px] my-auto text-ellipsis">
                Already have an account?
              </p>
              <p className="self-stretch text-[#0066ff] font-medium flex-1 my-auto px-[20px] text-ellipsis">
                Login
              </p>
            </Link>
          </form>
        </section>
      </div>
    </main>
  );
};

export default RegisterPage;
