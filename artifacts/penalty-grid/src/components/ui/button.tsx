import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-bold font-display uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-95",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_rgba(199,242,0,0.4)] hover:shadow-[0_0_25px_rgba(199,242,0,0.6)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[0_0_15px_rgba(255,0,0,0.4)] hover:bg-destructive/90 hover:shadow-[0_0_25px_rgba(255,0,0,0.6)]",
        outline:
          "border-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        stadium: "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.4)] hover:shadow-[0_0_30px_rgba(255,255,255,0.7)] hover:bg-gray-100",
      },
      size: {
        default: "h-12 px-6 py-2",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-14 rounded-md px-8 text-lg",
        icon: "h-12 w-12",
        xl: "h-16 rounded-lg px-10 text-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
