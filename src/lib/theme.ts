import { useEffect, useState } from "react";

export type HostTheme = "light" | "dark";

// claude.ai and ChatGPT both expose their in-app theme on <html>, but with
// different markers. Read the explicit marker first; the OS preference is only
// a fallback because either site can be dark while the OS is light.
function fromMarkers(root: HTMLElement): HostTheme | null {
  if (root.classList.contains("dark")) return "dark";
  if (root.classList.contains("light")) return "light";
  const attr =
    root.getAttribute("data-theme") ?? root.getAttribute("data-mode");
  if (attr === "dark") return "dark";
  if (attr === "light") return "light";
  return null;
}

export function detectHostTheme(
  root: HTMLElement = document.documentElement,
): HostTheme {
  const marked = fromMarkers(root);
  if (marked) return marked;
  // jsdom doesn't implement matchMedia; real browsers do.
  if (typeof window.matchMedia !== "function") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function useHostTheme(): HostTheme {
  const [theme, setTheme] = useState<HostTheme>(() => detectHostTheme());

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() =>
      setTheme(detectHostTheme(root)),
    );
    observer.observe(root, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "data-mode"],
    });
    setTheme(detectHostTheme(root));
    return () => observer.disconnect();
  }, []);

  return theme;
}
