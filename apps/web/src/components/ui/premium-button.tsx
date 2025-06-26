import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PremiumButtonProps {
	children: ReactNode;
	className?: string;
	variant?: "premium" | "ghost" | "outline";
	size?: "sm" | "md" | "lg";
	glow?: boolean;
	magnetic?: boolean;
	onClick?: () => void;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
}

export const PremiumButton = forwardRef<HTMLButtonElement, PremiumButtonProps>(
	(
		{
			children,
			className,
			variant = "premium",
			size = "md",
			glow = false,
			magnetic = false,
			onClick,
			disabled = false,
			type = "button",
			...props
		},
		ref,
	) => {
		const baseClasses =
			"inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

		const sizeClasses = {
			sm: "px-4 py-2 text-sm",
			md: "px-6 py-3 text-base",
			lg: "px-8 py-4 text-lg",
		};

		const variantClasses = {
			premium: "btn-premium text-white shadow-lg hover:shadow-xl",
			ghost:
				"bg-transparent hover:bg-accent/10 text-foreground hover:text-accent-foreground",
			outline:
				"border-2 border-gradient-to-r from-blue-500 to-purple-500 bg-transparent hover:bg-gradient-to-r hover:from-blue-500 hover:to-purple-500 hover:text-white text-foreground",
		};

		const effectClasses = cn(
			glow && "hover:glow-effect",
			magnetic && "magnetic-element",
		);

		return (
			<button
				ref={ref}
				type={type}
				onClick={onClick}
				disabled={disabled}
				className={cn(
					baseClasses,
					sizeClasses[size],
					variantClasses[variant],
					effectClasses,
					className,
				)}
				{...props}
			>
				{children}
			</button>
		);
	},
);

PremiumButton.displayName = "PremiumButton";
