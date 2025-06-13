import React from "react";

interface InputFieldProps {
  name: string; // Name of the input field, used for form handling
  type: string; // Type of the input field 
  placeholder: string; // Placeholder text displayed in the input field
  iconSrc?: string; // Optional source URL for an icon displayed next to the input field
  iconAlt?: string; // Optional alt text for the icon image
  register?: any; // Function for registering the input field with the form 
  error?: string | undefined; // Optional error message to display if validation fails
}

const InputField: React.FC<InputFieldProps> = ({
  name,
  type,
  placeholder,
  iconSrc,
  iconAlt,
  register,
  error,
}) => {
  return (
    <div className="rounded-[6px] bg-white shadow-lg flex w-full items-center gap-2.5 overflow-hidden text-black whitespace-nowrap leading-[40px] justify-start flex-wrap p-2.5 md:max-w-full md:whitespace-normal">
      {/* Render the icon if an iconSrc is provided */}
      {iconSrc ? (
        <img
          loading="lazy"
          src={iconSrc} 
          alt={iconAlt} 
          className="aspect-square object-contain object-center w-6 self-stretch my-auto"
        />
      ) : null}

      {/* Input field element */}
      <input
        type={type} 
        placeholder={placeholder} 
        className="self-stretch bg-white flex-1 basis-0 my-auto md:max-w-full font-bold"
        aria-label={placeholder} 
        {...register(name)} 
      />

      {error ? <div className="text-red-600">{error}</div> : null}
    </div>
  );
};

export default InputField;
