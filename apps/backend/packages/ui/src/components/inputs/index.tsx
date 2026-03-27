"use client";

import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";
import { useId, useState } from "react";

import { cn } from "../../lib/utils";
import { Icon } from "../ui/icon";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

type FieldShellProps = {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
  id?: string;
};

function FieldShell({
  label,
  helperText,
  error,
  required,
  className,
  children,
  id
}: FieldShellProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label ? (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {required ? <span className="ml-1 text-[hsl(var(--destructive))]">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? (
        <p className="text-sm text-[hsl(var(--destructive))]">{error}</p>
      ) : helperText ? (
        <p className="text-sm text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  );
}

type BaseInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  wrapperClassName?: string;
};

export function TextInput({
  label,
  helperText,
  error,
  wrapperClassName,
  id,
  ...props
}: BaseInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <FieldShell
      label={label}
      helperText={helperText}
      error={error}
      required={props.required}
      className={wrapperClassName}
      id={inputId}
    >
      <Input id={inputId} aria-invalid={!!error} {...props} />
    </FieldShell>
  );
}

export function SearchInput({
  label,
  helperText,
  error,
  wrapperClassName,
  id,
  ...props
}: BaseInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <FieldShell
      label={label}
      helperText={helperText}
      error={error}
      required={props.required}
      className={wrapperClassName}
      id={inputId}
    >
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20L17 17" />
        </Icon>
        <Input
          id={inputId}
          type="search"
          aria-invalid={!!error}
          className="pl-10"
          {...props}
        />
      </div>
    </FieldShell>
  );
}

export function PasswordInput({
  label,
  helperText,
  error,
  wrapperClassName,
  id,
  ...props
}: BaseInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  const [visible, setVisible] = useState(false);

  return (
    <FieldShell
      label={label}
      helperText={helperText}
      error={error}
      required={props.required}
      className={wrapperClassName}
      id={inputId}
    >
      <div className="relative">
        <Input
          id={inputId}
          type={visible ? "text" : "password"}
          aria-invalid={!!error}
          className="pr-10"
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <Icon className="h-4 w-4">
            {visible ? <path d="M3 4.5L21 19.5M10 10.5A3 3 0 0 1 13.5 14M6.5 6.5C4.5 7.8 3 10 3 12c2.3 4 6.2 6 9 6 1.2 0 2.5-.2 3.9-.7M17.5 17.5C19.5 16.2 21 14 21 12c-2.3-4-6.2-6-9-6-1.2 0-2.5.2-3.9.7" /> : <path d="M3 12C5.5 7.5 9.5 5 12 5s6.5 2.5 9 7c-2.5 4.5-6.5 7-9 7s-6.5-2.5-9-7Z" />}
            {!visible ? <circle cx="12" cy="12" r="3" /> : null}
          </Icon>
        </button>
      </div>
    </FieldShell>
  );
}

export function NumberInput({
  label,
  helperText,
  error,
  wrapperClassName,
  id,
  ...props
}: BaseInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <FieldShell
      label={label}
      helperText={helperText}
      error={error}
      required={props.required}
      className={wrapperClassName}
      id={inputId}
    >
      <Input id={inputId} type="number" aria-invalid={!!error} {...props} />
    </FieldShell>
  );
}

type TextareaInputProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helperText?: string;
  error?: string;
  wrapperClassName?: string;
};

export function TextareaInput({
  label,
  helperText,
  error,
  wrapperClassName,
  id,
  ...props
}: TextareaInputProps) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;

  return (
    <FieldShell
      label={label}
      helperText={helperText}
      error={error}
      required={props.required}
      className={wrapperClassName}
      id={inputId}
    >
      <Textarea id={inputId} aria-invalid={!!error} {...props} />
    </FieldShell>
  );
}
