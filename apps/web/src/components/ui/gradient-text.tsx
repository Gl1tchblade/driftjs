import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface GradientTextProps {
	children: ReactNode;
	className?: string;
	variant?: "premium" | "aurora" | "custom";
	animated?: boolean;
	as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span";
}

export const GradientText = forwardRef<HTMLElement, GradientTextProps>(
	(
		{
			children,
			className,
			variant = "premium",
			animated = true,
			as: Component = "span",
			...props
		},
		ref,
	) => {
		const baseClasses = "font-bold";

		const variantClasses = {
			premium: animated
				? "gradient-text-premium"
				: "bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent",
			aurora: animated
				? "gradient-text-aurora"
				: "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent",
			custom: "bg-clip-text text-transparent",
		};

		return (
			<Component
				ref={ref as any}
				className={cn(baseClasses, variantClasses[variant], className)}
				{...props}
			>
				{children}
			</Component>
		);
	},
);

GradientText.displayName = "GradientText";
