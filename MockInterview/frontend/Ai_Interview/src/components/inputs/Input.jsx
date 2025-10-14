import React, { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa6";

const Input = ({
  value,
  onChange,
  label,
  placeholder,
  type = "text",
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const toggleShowPassword = () => setShowPassword((prev) => !prev);

  const effectiveType =
    type === "password" ? (showPassword ? "text" : "password") : type;

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1 text-[13px] font-medium text-slate-700">
          {label}
        </label>
      )}

      <div
        className="
          relative flex items-center w-full
          border border-gray-300 rounded-lg
          px-3 py-2
          bg-white
          transition-all duration-200
          focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-200
          hover:border-blue-400 hover:shadow-[0_0_0_3px_rgba(59,130,246,0.08)]
        "
      >
        <input
          type={effectiveType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="
            w-full bg-transparent outline-none text-sm text-gray-800
            placeholder:text-gray-400
          "
        />

        {/* 비밀번호 토글 */}
        {type === "password" && (
          <div className="absolute right-3 cursor-pointer text-gray-400 hover:text-blue-500 transition">
            {showPassword ? (
              <FaRegEye size={20} onClick={toggleShowPassword} />
            ) : (
              <FaRegEyeSlash size={20} onClick={toggleShowPassword} />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Input;
