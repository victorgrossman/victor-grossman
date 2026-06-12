"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

type VictorImageProps = {
  src: string;
  alt: string;
  className?: string;
  /** Cover a positioned parent (`relative` + aspect ratio). */
  fill?: boolean;
  width?: number;
  height?: number;
  sizes?: string;
  priority?: boolean;
};

export function VictorImage({
  src,
  alt,
  className,
  fill = false,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
}: VictorImageProps) {
  if (!src?.trim()) return null;

  if (fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className={cn("object-cover", className)}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={width ?? 800}
      height={height ?? 600}
      sizes={sizes}
      priority={priority}
      className={className}
    />
  );
}
