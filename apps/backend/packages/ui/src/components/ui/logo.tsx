import type { CSSProperties, ImgHTMLAttributes } from "react";

import type { DokanXLogoSize, DokanXLogoVariant } from "../../theme/dokanx-brand";
import { dokanxBrand } from "../../theme/dokanx-brand";
import { cn } from "../../lib/utils";

type LogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> & {
  variant?: DokanXLogoVariant;
  size?: DokanXLogoSize;
  decorative?: boolean;
};

const assetMap: Record<DokanXLogoVariant, string> = {
  icon: "/assets/logo/icon.svg",
  full: "/assets/logo/full.svg",
  mono: "/assets/logo/mono.svg"
};

const sizeMap: Record<DokanXLogoVariant, Record<DokanXLogoSize, { width: number; height: number }>> = {
  icon: {
    sm: { width: 36, height: 36 },
    md: { width: 48, height: 48 },
    lg: { width: 64, height: 64 }
  },
  full: {
    sm: { width: 126, height: 38 },
    md: { width: 162, height: 48 },
    lg: { width: 216, height: 64 }
  },
  mono: {
    sm: { width: 126, height: 38 },
    md: { width: 162, height: 48 },
    lg: { width: 216, height: 64 }
  }
};

const clearSpaceMap: Record<DokanXLogoVariant, Record<DokanXLogoSize, number>> = {
  icon: { sm: 0, md: 0, lg: 0 },
  full: { sm: dokanxBrand.clearSpace.sm, md: dokanxBrand.clearSpace.md, lg: dokanxBrand.clearSpace.lg },
  mono: { sm: dokanxBrand.clearSpace.sm, md: dokanxBrand.clearSpace.md, lg: dokanxBrand.clearSpace.lg }
};

export function Logo({
  variant = "full",
  size = "md",
  className,
  decorative = false,
  style,
  ...props
}: LogoProps) {
  const dimensions = sizeMap[variant][size];
  const resolvedStyle: CSSProperties = {
    width: dimensions.width,
    height: dimensions.height,
    padding: clearSpaceMap[variant][size],
    objectFit: "contain",
    ...style
  };

  return (
    <img
      src={assetMap[variant]}
      alt={decorative ? "" : `DokanX ${variant} logo`}
      aria-hidden={decorative || undefined}
      className={cn("block shrink-0 select-none object-contain", className)}
      style={resolvedStyle}
      {...props}
    />
  );
}
