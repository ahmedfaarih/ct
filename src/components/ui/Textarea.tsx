import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, className = "", id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-xs font-medium text-neutral-500 uppercase tracking-widest mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full px-3 py-2.5 bg-white border rounded text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none transition resize-y min-h-[96px] ${
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

Textarea.displayName = "Textarea";
export default Textarea;
