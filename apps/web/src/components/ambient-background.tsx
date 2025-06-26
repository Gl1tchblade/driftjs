import { useEffect, useRef } from "react";

interface AmbientBackgroundProps {
	variant?: "default" | "hero" | "section";
	className?: string;
}

export function AmbientBackground({
	variant = "default",
	className = "",
}: AmbientBackgroundProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const mouseRef = useRef({ x: 0, y: 0 });

	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const handleMouseMove = (e: MouseEvent) => {
			const rect = container.getBoundingClientRect();
			mouseRef.current = {
				x: e.clientX - rect.left,
				y: e.clientY - rect.top,
			};

			// Update CSS custom properties for magnetic effects
			container.style.setProperty(
				"--mouse-x",
				`${(mouseRef.current.x - rect.width / 2) * 0.02}px`,
			);
			container.style.setProperty(
				"--mouse-y",
				`${(mouseRef.current.y - rect.height / 2) * 0.02}px`,
			);
		};

		container.addEventListener("mousemove", handleMouseMove);
		return () => container.removeEventListener("mousemove", handleMouseMove);
	}, []);

	const getOrbConfiguration = () => {
		switch (variant) {
			case "hero":
				return {
					orbs: [
						{
							size: 400,
							gradient:
								"linear-gradient(135deg, #667eea 0%, #764ba2 60%, #f093fb 100%)",
							position: { top: "-200px", left: "-200px" },
							delay: "0s",
							blur: "60px",
						},
						{
							size: 300,
							gradient:
								"linear-gradient(135deg, #f093fb 0%, #f5576c 60%, #ffecd2 100%)",
							position: { top: "20%", right: "-150px" },
							delay: "-8s",
							blur: "50px",
						},
						{
							size: 350,
							gradient:
								"linear-gradient(135deg, #4facfe 0%, #00f2fe 60%, #667eea 100%)",
							position: { bottom: "-175px", left: "30%" },
							delay: "-16s",
							blur: "55px",
						},
					],
				};
			case "section":
				return {
					orbs: [
						{
							size: 250,
							gradient: "linear-gradient(135deg, #667eea 0%, #f093fb 100%)",
							position: { top: "-125px", right: "-125px" },
							delay: "-5s",
							blur: "40px",
						},
						{
							size: 200,
							gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
							position: { bottom: "-100px", left: "-100px" },
							delay: "-12s",
							blur: "35px",
						},
					],
				};
			default:
				return {
					orbs: [
						{
							size: 300,
							gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
							position: { top: "-150px", left: "-150px" },
							delay: "0s",
							blur: "40px",
						},
						{
							size: 200,
							gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
							position: { top: "50%", right: "-100px" },
							delay: "-7s",
							blur: "40px",
						},
						{
							size: 250,
							gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
							position: {
								bottom: "-125px",
								left: "50%",
								transform: "translateX(-50%)",
							},
							delay: "-14s",
							blur: "40px",
						},
					],
				};
		}
	};

	const { orbs } = getOrbConfiguration();

	return (
		<div
			ref={containerRef}
			className={`ambient-container absolute inset-0 ${className}`}
			style={{ pointerEvents: "none" }}
		>
			{orbs.map((orb, index) => (
				<div
					key={index}
					className="ambient-orb absolute rounded-full opacity-60"
					style={{
						width: `${orb.size}px`,
						height: `${orb.size}px`,
						background: orb.gradient,
						filter: `blur(${orb.blur})`,
						animationDelay: orb.delay,
						...orb.position,
					}}
				/>
			))}

			{/* Subtle mesh gradient overlay */}
			<div
				className="absolute inset-0 opacity-30"
				style={{
					background: `
            radial-gradient(circle at 25% 25%, rgba(102, 126, 234, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(240, 147, 251, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 50%, rgba(79, 172, 254, 0.05) 0%, transparent 50%)
          `,
				}}
			/>
		</div>
	);
}

// Particle system component for more dynamic effects
interface ParticleSystemProps {
	density?: number;
	className?: string;
}

export function ParticleSystem({
	density = 50,
	className = "",
}: ParticleSystemProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		const particles: Array<{
			x: number;
			y: number;
			vx: number;
			vy: number;
			size: number;
			opacity: number;
			color: string;
		}> = [];

		const colors = [
			"rgba(102, 126, 234, 0.3)",
			"rgba(118, 75, 162, 0.3)",
			"rgba(240, 147, 251, 0.3)",
			"rgba(79, 172, 254, 0.3)",
		];

		// Initialize particles
		for (let i = 0; i < density; i++) {
			particles.push({
				x: Math.random() * canvas.width,
				y: Math.random() * canvas.height,
				vx: (Math.random() - 0.5) * 0.5,
				vy: (Math.random() - 0.5) * 0.5,
				size: Math.random() * 2 + 1,
				opacity: Math.random() * 0.5 + 0.1,
				color: colors[Math.floor(Math.random() * colors.length)],
			});
		}

		const animate = () => {
			ctx.clearRect(0, 0, canvas.width, canvas.height);

			particles.forEach((particle) => {
				// Update position
				particle.x += particle.vx;
				particle.y += particle.vy;

				// Wrap around edges
				if (particle.x < 0) particle.x = canvas.width;
				if (particle.x > canvas.width) particle.x = 0;
				if (particle.y < 0) particle.y = canvas.height;
				if (particle.y > canvas.height) particle.y = 0;

				// Draw particle
				ctx.globalAlpha = particle.opacity;
				ctx.fillStyle = particle.color;
				ctx.beginPath();
				ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
				ctx.fill();
			});

			// Connect nearby particles
			for (let i = 0; i < particles.length; i++) {
				for (let j = i + 1; j < particles.length; j++) {
					const dx = particles[i].x - particles[j].x;
					const dy = particles[i].y - particles[j].y;
					const distance = Math.sqrt(dx * dx + dy * dy);

					if (distance < 100) {
						ctx.globalAlpha = ((100 - distance) / 100) * 0.1;
						ctx.strokeStyle = "rgba(102, 126, 234, 0.2)";
						ctx.lineWidth = 1;
						ctx.beginPath();
						ctx.moveTo(particles[i].x, particles[i].y);
						ctx.lineTo(particles[j].x, particles[j].y);
						ctx.stroke();
					}
				}
			}

			requestAnimationFrame(animate);
		};

		const handleResize = () => {
			canvas.width = canvas.offsetWidth;
			canvas.height = canvas.offsetHeight;
		};

		handleResize();
		animate();

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [density]);

	return (
		<canvas
			ref={canvasRef}
			className={`absolute inset-0 ${className}`}
			style={{ pointerEvents: "none" }}
		/>
	);
}
