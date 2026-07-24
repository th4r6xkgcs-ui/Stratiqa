import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";

const cx = (...classes: Array<string | false | undefined>) =>
  classes.filter(Boolean).join(" ");

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return <article className={cx("card", className)} {...props} />;
}

export function Button({
  className,
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
}) {
  return (
    <button
      className={cx("button", `button--${variant}`, className)}
      {...props}
    />
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "accent" | "warning";
}) {
  return <span className={cx("badge", `badge--${tone}`)}>{children}</span>;
}

export function Metric({
  label,
  value,
  detail,
  positive,
}: {
  label: string;
  value: string;
  detail?: string;
  positive?: boolean;
}) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail ? (
        <small className={positive ? "positive" : undefined}>{detail}</small>
      ) : null}
    </div>
  );
}
