import type { SVGProps } from "react";

import { cn } from "../../lib/utils";

type IconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

export function Icon({
  className,
  title,
  children,
  ...props
}: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      className={cn("h-4 w-4 shrink-0", className)}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
