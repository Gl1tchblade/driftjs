import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface TypingAnimationProps {
	text: string;
	speed?: number;
	delay?: number;
	className?: string;
	showCursor?: boolean;
	onComplete?: () => void;
}

export function TypingAnimation({
	text,
	speed = 50,
	delay = 0,
	className = "",
	showCursor = true,
	onComplete,
}: TypingAnimationProps) {
	const [displayText, setDisplayText] = useState("");
	const [isComplete, setIsComplete] = useState(false);
	const [shouldStart, setShouldStart] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => {
			setShouldStart(true);
		}, delay);

		return () => clearTimeout(timer);
	}, [delay]);

	useEffect(() => {
		if (!shouldStart) return;

		let currentIndex = 0;
		const timer = setInterval(() => {
			if (currentIndex <= text.length) {
				setDisplayText(text.slice(0, currentIndex));
				currentIndex++;
			} else {
				setIsComplete(true);
				onComplete?.();
				clearInterval(timer);
			}
		}, speed);

		return () => clearInterval(timer);
	}, [text, speed, shouldStart, onComplete]);

	return (
		<motion.span
			className={className}
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
		>
			{displayText}
			{showCursor && (
				<motion.span
					animate={{ opacity: isComplete ? 0 : [0, 1, 0] }}
					transition={{
						duration: 1,
						repeat: isComplete ? 0 : Number.POSITIVE_INFINITY,
						ease: "linear",
					}}
					className="ml-1 inline-block h-5 w-0.5 bg-current"
				/>
			)}
		</motion.span>
	);
}
