import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AmbientBackground } from "@/components/ambient-background";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

function FlowProductPage() {
	return (
		<PageLayout>
			<section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
				<h1 className="mb-6 text-5xl font-semibold lowercase">
					<span className="gradient-text-static lowercase">flow</span>
				</h1>
				<p className="max-w-xl text-muted-foreground">
					The smart CLI for safe schema evolution. Flow wraps your ORM to automate zero-downtime migrations and prevent production risks.
				</p>
				<div className="mt-8 flex flex-col gap-4 sm:flex-row sm:gap-6">
					{/* Install CLI */}
					<Button
						variant="outline"
						size="lg"
						className="lowercase w-48"
						asChild
					>
						<Link to={"/docs/flow/installation" as any}>install cli</Link>
					</Button>

					{/* View docs */}
					<Button
						variant="outline"
						size="lg"
						className="lowercase w-48"
						asChild
					>
						<Link to={"/docs/flow" as any}>view docs</Link>
					</Button>
				</div>
			</section>
		</PageLayout>
	);
}

export const Route = createFileRoute("/flow")({
	component: FlowProductPage,
});
