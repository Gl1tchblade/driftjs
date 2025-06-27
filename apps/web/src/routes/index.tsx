import { createFileRoute } from "@tanstack/react-router";
import PageLayout from "@/components/page-layout";
import { MinimalHero } from "@/components/landing/minimal-hero";
import { ProductsSection } from "@/components/landing/products-section";
import MinimalFeaturesSection from "@/components/landing/minimal-features-section";

function HomePage() {
	return (
		<PageLayout>
			<MinimalHero />
			<ProductsSection />
			<MinimalFeaturesSection />
		</PageLayout>
	);
}

export const Route = createFileRoute("/")({
	component: HomePage,
	/**
	 * SEO / social metadata for the root page
	 */
	head: () => ({
		meta: [
			{
				title: "DriftJS — tools developers love",
			},
			{
				name: "description",
				content:
					"DriftJS builds open-source tooling – like Flow – that helps developers ship schema changes safely and confidently.",
			},
			{
				name: "twitter:card",
				content: "summary_large_image",
			},
			{
				property: "og:title",
				content: "DriftJS — tools developers love",
			},
			{
				property: "og:description",
				content:
					"DriftJS builds open-source tooling – like Flow – that helps developers ship schema changes safely and confidently.",
			},
			{
				property: "og:type",
				content: "website",
			},
			{
				property: "og:image",
				content: "/logo.jpg",
			},
		],
		links: [
			{
				rel: "canonical",
				href: "https://driftjs.dev/",
			},
		],
	}),
});
