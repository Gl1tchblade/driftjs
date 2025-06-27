import { createFileRoute } from "@tanstack/react-router";
import { motion } from "motion/react";
import { AmbientBackground } from "@/components/ambient-background";
import { FadeIn } from "@/components/animations/fade-in";
import { StaggerContainer } from "@/components/animations/stagger-container";
import PageLayout from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

// The banner image now lives in `src/assets/flow-banner.jpg` for consistent bundler handling
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
const FLOW_BANNER_SRC = new URL("../assets/flow-banner.jpg", import.meta.url).href;

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
	/**
	 * SEO / social metadata for the Flow product page
	 */
	head: () => ({
		meta: [
			{
				title: "Flow — zero-downtime migrations by DriftJS",
			},
			{
				name: "description",
				content:
					"Flow is a smart CLI from DriftJS that wraps your ORM to automate zero-downtime database migrations and prevent production risks.",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				property: "og:title",
				content: "Flow — zero-downtime migrations by DriftJS",
			},
			{
				property: "og:description",
				content:
					"Flow is a smart CLI from DriftJS that wraps your ORM to automate zero-downtime database migrations and prevent production risks.",
			},
			{
				property: "og:type",
				content: "product",
			},
			{
				property: "og:image",
				content: FLOW_BANNER_SRC,
			},
			{
				name: "twitter:image",
				content: FLOW_BANNER_SRC,
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://driftjs.dev/flow",
			},
		],
	}),
});
