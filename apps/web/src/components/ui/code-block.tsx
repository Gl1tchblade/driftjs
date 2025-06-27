import { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import Prism from "prismjs";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-yaml";

interface CodeBlockProps {
	code: string;
	language?: string;
	title?: string;
	showCopy?: boolean;
	className?: string;
	variant?: "default" | "fancy";
}

const brandBlue = "#3b82f6"; // tailwind sky-500 – Drift signature

const driftOneDark = {
	...oneDark,
	function: {
		...((oneDark as any).function ?? {}),
		color: brandBlue,
	},
	'class-name': {
		...((oneDark as any)["class-name"] ?? {}),
		color: brandBlue,
	},
};

// Extend Prism bash grammar to treat our CLI name `flow` as a builtin/command so
// it receives the signature blue colour in all Bash code blocks.
(() => {
	const bash = Prism?.languages?.bash as any;
	if (!bash || bash.__flowInjected) return; // guard against double-inject

	// Insert a new token before existing patterns that matches the word `flow`
	// at the start of a line or preceded by whitespace, followed by whitespace
	// (i.e. the typical command position). We alias it as `class-name` so it
	// inherits our custom colour defined in the theme later.
	if (Prism.languages.insertBefore) {
		Prism.languages.insertBefore("bash", "builtin", {
			flowcmd: {
				pattern: /\bflow\b/,
				alias: "class-name",
			},
		});
	}

	bash.__flowInjected = true;
})();

export function CodeBlock({
	code,
	language = "bash",
	title,
	showCopy = true,
	className,
	variant = "default",
}: CodeBlockProps) {
	const [copied, setCopied] = useState(false);

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(code);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy text: ", err);
		}
	};

	if (variant === "fancy") {
		return (
			<div
				className={cn(
					"bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4",
					className,
				)}
			>
				{code.split("\n").map((line, i) => {
					if (line.trim().startsWith("#")) {
						return (
							<span key={i} className="text-gray-500">
								{line}
								<br />
							</span>
						);
					}
					if (line.trim().startsWith("$")) {
						return (
							<span key={i}>
								<span className="text-yellow-400">{line.split(" ")[0]}</span>{" "}
								{line.slice(line.indexOf(" ") + 1)}
								<br />
							</span>
						);
					}
					return (
						<span key={i}>
							{line}
							<br />
						</span>
					);
				})}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"relative my-6 rounded-lg border border-zinc-800 bg-zinc-950/70 shadow-sm",
				className,
			)}
		>
			{title && (
				<div className="border-zinc-800 border-b px-4 py-3">
					<span className="font-medium text-sm text-zinc-300">{title}</span>
				</div>
			)}

			<div className="relative">
				{showCopy && (
					<Button
						variant="ghost"
						size="icon"
						onClick={copyToClipboard}
						className="absolute top-2 right-2 z-10 size-8 rounded-md text-zinc-400 hover:bg-zinc-800 hover:text-white"
						aria-label="Copy code"
					>
						{copied ? (
							<span className="text-xs">✓</span>
						) : (
							<svg
								xmlns="http://www.w3.org/2000/svg"
								className="size-4"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M8 16h8a2 2 0 002-2V6a2 2 0 00-2-2H8a2 2 0 00-2 2v8a2 2 0 002 2z"
								/>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M16 8h2a2 2 0 012 2v8a2 2 0 01-2 2H10a2 2 0 01-2-2v-2"
								/>
							</svg>
						)}
					</Button>
				)}

				<SyntaxHighlighter
					language={language}
					style={{
						...driftOneDark,
						'pre[class*="language-"]': {
							...oneDark['pre[class*="language-"]'],
							background: "transparent",
							margin: 0,
							padding: "1rem",
						},
						'code[class*="language-"]': {
							...oneDark['code[class*="language-"]'],
							background: "transparent",
						},
					}}
					customStyle={{
						background: "transparent",
						fontSize: "14px",
						lineHeight: "1.5",
					}}
					wrapLines
					showLineNumbers={false}
				>
					{code}
				</SyntaxHighlighter>
			</div>
		</div>
	);
}
