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
});
