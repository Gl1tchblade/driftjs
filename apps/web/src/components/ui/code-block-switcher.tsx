import { useState, useEffect } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";

interface Variant {
  label: string;
  code: string;
  language?: string;
}

interface CodeBlockSwitcherProps {
  id: string; // unique id to persist selection
  variants: Variant[];
  className?: string;
  variant?: "default" | "fancy";
}

// NEW: simple clipboard utility used by header copy button
function useCopy(text: string) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return { copied, copy };
}

export function CodeBlockSwitcher({
  id,
  variants,
  className,
  variant,
}: CodeBlockSwitcherProps) {
  const storageKey = `codeBlockSwitcher:${id}`;

  const [index, setIndex] = useState(0);

  // hydrate from storage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(storageKey);
    if (stored !== null) {
      const i = Number(stored);
      if (!Number.isNaN(i) && i < variants.length) setIndex(i);
    }
  }, []);

  // persist on change
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(storageKey, String(index));
  }, [index]);

  const current = variants[index];

  // NEW: copy logic for header button
  const { copied, copy } = useCopy(current.code);

  return (
    <div
      className={cn(
        "relative my-4 rounded-lg border border-zinc-800 bg-zinc-950/70 shadow-sm",
        className,
      )}
    >
      {/* Header: variant selector + copy button */}
      <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-2">
        <div className="flex gap-2">
          {variants.map((v, i) => (
            <button
              key={v.label}
              onClick={() => setIndex(i)}
              className={cn(
                "rounded-md px-3 py-1 text-xs capitalize transition-colors",
                i === index
                  ? "bg-sky-600 text-white"
                  : "bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-white",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <button
          onClick={copy}
          className="text-zinc-400 hover:text-white focus:outline-none"
          aria-label="Copy code"
        >
          {copied ? (
            <span className="text-sm">✓ Copied</span>
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
        </button>
      </div>

      <CodeBlock
        code={current.code}
        language={current.language ?? "bash"}
        className="rounded-none border-none bg-transparent my-0"
        showCopy={false} // hide internal copy button – we render our own in header
        variant={variant}
      />
    </div>
  );
} 