import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  fullWidth?: boolean;
};

export function Button({
  className,
  variant = "primary",
  fullWidth = false,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      className={[
        "button",
        `button--${variant}`,
        fullWidth && "button--full",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      type={type}
      {...props}
    />
  );
}
