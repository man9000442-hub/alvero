import React from "react";

interface FieldWrapperProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

export function FieldWrapper({
  label,
  error,
  hint,
  required,
  children,
  htmlFor,
}: FieldWrapperProps) {
  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label
          htmlFor={htmlFor}
          className="block text-[11px] font-medium uppercase tracking-[0.1em] text-[#555555]"
        >
          {label}
          {required && <span className="ms-1 text-black">*</span>}
        </label>
      )}
      {children}
      {error && (
        <p className="text-xs text-black font-medium border-s-2 border-black ps-2">
          {error}
        </p>
      )}
      {!error && hint && <p className="text-xs text-[#777777]">{hint}</p>}
    </div>
  );
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, required, id, className = "", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        htmlFor={inputId}
      >
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={`w-full h-11 px-3.5 bg-white text-sm text-black placeholder:text-[#999999] border transition-colors focus:outline-none ${
            error
              ? "border-black ring-1 ring-black"
              : "border-[#E5E5E5] focus:border-black"
          } ${className}`}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, hint, required, id, className = "", ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        htmlFor={inputId}
      >
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          className={`w-full min-h-[96px] p-3.5 bg-white text-sm text-black placeholder:text-[#999999] border transition-colors focus:outline-none ${
            error
              ? "border-black ring-1 ring-black"
              : "border-[#E5E5E5] focus:border-black"
          } ${className}`}
          {...props}
        />
      </FieldWrapper>
    );
  },
);
Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    { label, error, hint, required, id, className = "", children, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    return (
      <FieldWrapper
        label={label}
        error={error}
        hint={hint}
        required={required}
        htmlFor={inputId}
      >
        <select
          ref={ref}
          id={inputId}
          required={required}
          className={`w-full h-11 px-3.5 bg-white text-sm text-black border transition-colors focus:outline-none ${
            error
              ? "border-black ring-1 ring-black"
              : "border-[#E5E5E5] focus:border-black"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
      </FieldWrapper>
    );
  },
);
Select.displayName = "Select";
