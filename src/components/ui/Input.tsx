import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, hint, error, className = "", id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full px-3 py-2.5 bg-white border rounded text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition ${
            error
              ? "border-neutral-400 focus:border-neutral-600"
              : "border-neutral-200 focus:border-neutral-400"
          } ${className}`}
          {...props}
        />
        {hint && !error && (
          <p className="mt-1 text-xs text-neutral-400">{hint}</p>
        )}
        {error && (
          <p className="mt-1 text-xs text-neutral-600">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export default Input;
