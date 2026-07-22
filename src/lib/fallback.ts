import { logger } from "./logger";

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    logger.error("clipboard write failed", error);
    return false;
  }
}

export function showToast(message: string): void {
  const toast = document.createElement("div");
  toast.setAttribute("data-qd-toast", "");
  toast.textContent = message;
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "rgba(20,20,20,0.92)",
    color: "#fff",
    padding: "10px 16px",
    borderRadius: "8px",
    fontSize: "13px",
    zIndex: "2147483647",
  });
  document.body.append(toast);
  setTimeout(() => toast.remove(), 3000);
}
