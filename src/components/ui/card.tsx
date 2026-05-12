import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva("flex flex-col", {
  variants: {
    variant: {
      default: "rounded-xl border bg-card text-card-foreground shadow",

      // Chunky panel: cream-green background, 4px black border, hard-offset
      // black shadow. The repeating pattern across App.tsx + profile pages.
      game: "rounded-[8px] border-4 border-black bg-pb-bg shadow-[4px_4px_0_black]",
    },
    tone: {
      // For variant="game" only — vary the panel color.
      cream: "bg-pb-bg",
      white: "bg-white",
      leaf: "bg-pb-leaf",
      glass: "bg-pb-bg/90",
      grass: "bg-pb-grass",
    },
    size: {
      sm: "p-3 gap-2",
      md: "p-5 gap-3",
      lg: "p-8 gap-4",
    },
    shadow: {
      sm: "shadow-[2px_2px_0_black]",
      md: "shadow-[4px_4px_0_black]",
      lg: "shadow-[8px_8px_0_black]",
      none: "shadow-none",
    },
  },
  defaultVariants: {
    variant: "default",
    size: "md",
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, tone, size, shadow, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, tone, size, shadow, className }))}
      {...props}
    />
  )
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1.5", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-emboss text-base", className)}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground font-bold", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("", className)} {...props} />
));
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center", className)}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  cardVariants,
};
