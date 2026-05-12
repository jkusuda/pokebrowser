import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all duration-75 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // shadcn defaults — kept available for places that want subtle UI.
        default: "bg-primary text-primary-foreground rounded-md hover:bg-primary/90 px-4 py-2 text-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground rounded-md px-4 py-2 text-sm",
        link: "text-primary underline-offset-4 hover:underline px-0",

        // The Pokebrowser look: chunky black border + hard-offset shadow,
        // pressed-button active state, embossed uppercase text.
        game: "border-4 border-black rounded-[8px] shadow-[4px_4px_0_black] font-black uppercase tracking-widest text-white [-webkit-text-stroke:0.5px_black] [text-shadow:0_1px_0_black] hover:translate-y-px active:shadow-none active:translate-x-[3px] active:translate-y-[3px]",
      },
      // `tone` only meaningfully applies to `variant="game"`. Default variant
      // owns its own background via Tailwind theme tokens.
      tone: {
        primary: "bg-pb-grass-deep hover:bg-pb-grass active:bg-pb-grass",
        danger: "bg-red-500 hover:bg-red-600 active:bg-red-700",
        neutral: "bg-pb-bg !text-black [-webkit-text-stroke:0px] [text-shadow:none] hover:bg-pb-leaf",
        forest: "bg-pb-pine hover:bg-pb-grass-deep active:bg-pb-forest",
        mint: "bg-pb-grass !text-black [-webkit-text-stroke:0px] [text-shadow:none] hover:bg-pb-grass-hover",
      },
      size: {
        sm: "h-9 px-4 text-[10px]",
        md: "h-11 px-6 text-[12px]",
        lg: "h-14 px-8 text-[14px]",
        icon: "h-10 w-10",
      },
    },
    compoundVariants: [
      // Game variant w/o explicit tone defaults to primary green.
      { variant: "game", tone: undefined, class: "bg-pb-grass-deep hover:bg-pb-grass" },
    ],
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, tone, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, tone, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
