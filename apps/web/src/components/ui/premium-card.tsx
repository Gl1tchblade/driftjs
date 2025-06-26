import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumCardProps {
	children: ReactNode;
	className?: string;
	variant?: "glass" | "solid" | "gradient";
	hover?: boolean;
	glow?: boolean;
	magnetic?: boolean;
}

export const PremiumCard = forwardRef<HTMLDivElement, PremiumCardProps>(
	(
		{
			children,
			className,
			variant = "glass",
			hover = true,
			glow = false,
			magnetic = false,
			...props
		},
		ref,
	) => {
		const baseClasses = "rounded-2xl p-6 transition-all duration-300";

		const variantClasses = {
			glass: "glass-effect",
			solid: "bg-card border border-border/50 shadow-lg",
			gradient:
				"bg-gradient-to-br from-card/80 to-card/40 border border-border/30",
		};

		const effectClasses = cn(
			hover && "hover:-translate-y-1 hover:scale-[1.02]",
			glow && "glow-effect",
			magnetic && "magnetic-element",
			glow && hover && "hover:glow-effect",
		);

		return (
			<div
				ref={ref}
				className={cn(
					baseClasses,
					variantClasses[variant],
					effectClasses,
					className,
				)}
				{...props}
			>
				{children}
			</div>
		);
	},
);

PremiumCard.displayName = "PremiumCard";
