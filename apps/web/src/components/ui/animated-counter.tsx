import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface AnimatedCounterProps {
	end: number;
	duration?: number;
	prefix?: string;
	suffix?: string;
	className?: string;
	start?: number;
}

export function AnimatedCounter({
	end,
	duration = 2,
	prefix = "",
	suffix = "",
	className = "",
	start = 0,
}: AnimatedCounterProps) {
	const [count, setCount] = useState(start);
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		if (!isVisible) return;

		const increment = end / (duration * 60); // 60 FPS
		const timer = setInterval(() => {
			setCount((prev) => {
				const next = prev + increment;
				if (next >= end) {
					clearInterval(timer);
					return end;
				}
				return next;
			});
		}, 1000 / 60);

		return () => clearInterval(timer);
	}, [end, duration, isVisible]);

	const formattedCount = Math.floor(count).toLocaleString();

	return (
		<motion.span
			initial={{ opacity: 0 }}
			whileInView={{ opacity: 1 }}
			viewport={{ once: true }}
			onViewportEnter={() => setIsVisible(true)}
			className={className}
		>
			{prefix}
			{formattedCount}
			{suffix}
		</motion.span>
	);
}
