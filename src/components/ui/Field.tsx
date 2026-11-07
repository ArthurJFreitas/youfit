import { cloneElement, type ReactElement, type ReactNode } from "react";

type DescribedControlProps = {
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

type FieldProps = {
  children: ReactElement<DescribedControlProps>;
  error?: string;
  hint?: ReactNode;
  htmlFor: string;
  label: ReactNode;
  optional?: boolean;
};

export function Field({
  children,
  error,
  hint,
  htmlFor,
  label,
  optional = false,
}: FieldProps) {
  const hintId = hint ? `${htmlFor}-hint` : undefined;
  const errorId = error ? `${htmlFor}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field" data-invalid={error ? "true" : undefined}>
      <label className="field__label" htmlFor={htmlFor}>
        <span>{label}</span>
        {optional && <span className="field__optional">Opcional</span>}
      </label>
      {cloneElement(children, {
        "aria-describedby": describedBy,
        "aria-invalid": error ? true : undefined,
      })}
      {hint && (
        <span className="field__hint" id={hintId}>
          {hint}
        </span>
      )}
      {error && (
        <span className="field__error" id={errorId} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
