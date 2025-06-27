import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import {
	createRootRouteWithContext,
	HeadContent,
	Outlet,
	useRouterState,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import Loader from "@/components/loader";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { trpc } from "@/utils/trpc";
import "../index.css";
import NotFound from "@/components/not-found";
import { type HeadElement } from "@tanstack/react-router";

export interface RouterAppContext {
	trpc: typeof trpc;
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterAppContext>()({
	component: RootComponent,
	notFoundComponent: NotFound,
	head: function () {
		const pathname = useRouterState({ select: (s) => s.resolvedLocation.pathname || "" });
		const canonicalUrl = `https://driftjs.com${pathname}`;
		const siteDescription =
			"DriftJS builds tools developers love. From production-safe database migrations to intelligent workflow automation, we help you ship with confidence.";
		const siteName = "DriftJS"; // Placeholder
		const siteUrl = "https://driftjs.com"; // Placeholder
		const ogImageUrl = `${siteUrl}/flow-banner.png`; // Placeholder
		const twitterImageUrl = `${siteUrl}/flow-banner.png`; // Placeholder

		const webSiteJsonLd = {
			"@context": "https://schema.org",
			"@type": "WebSite",
			name: siteName,
			url: siteUrl,
			description: siteDescription,
		};

		return {
			meta: [
				{
					title: siteName, // Use siteName for consistency
				},
				{
					name: "description",
					content: siteDescription,
				},
				// Open Graph Tags
				{
					property: "og:type",
					content: "website",
				},
				{
					property: "og:title",
					content: siteName,
				},
				{
					property: "og:description",
					content: siteDescription,
				},
				{
					property: "og:url",
					content: canonicalUrl,
				},
				{
					property: "og:image",
					content: ogImageUrl,
				},
				// Twitter Card Tags
				{
					name: "twitter:card",
					content: "summary_large_image",
				},
				{
					name: "twitter:title",
					content: siteName,
				},
				{
					name: "twitter:description",
					content: siteDescription,
				},
				{
					name: "twitter:url",
					content: canonicalUrl,
				},
				{
					name: "twitter:image",
					content: twitterImageUrl,
				},
			],
			links: [
				{
					rel: "canonical",
					href: canonicalUrl,
				},
			],
			scripts: [
				{
					type: "application/ld+json",
					children: JSON.stringify(webSiteJsonLd),
				},
			],
		};
	},
});

function RootComponent() {
	const isFetching = useRouterState({
		select: (s) => s.isLoading,
	});

	return (
		<>
			<HeadContent />
			<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
				<div className="min-h-screen">
					{isFetching ? <Loader /> : <Outlet />}
				</div>
				<Toaster richColors />
			</ThemeProvider>
			{import.meta.env.DEV && (
				// Development-only debugging helpers
				<>
					<TanStackRouterDevtools position="bottom-left" />
					<ReactQueryDevtools position="bottom" buttonPosition="bottom-right" />
				</>
			)}
		</>
	);
}
