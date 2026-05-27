import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function ClickTracker() {
  const location = useLocation();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Find the closest element with a tracking attribute
      const target = e.target as HTMLElement;
      const trackedElement = target.closest('[data-track="true"], [data-action]');
      
      if (!trackedElement) return;

      const action = trackedElement.getAttribute("data-action") || "UI_CLICK";
      const targetLabel = trackedElement.getAttribute("aria-label") || trackedElement.textContent?.trim() || trackedElement.tagName;
      
      // We don't want to track extremely long text
      const cleanLabel = targetLabel.length > 100 ? targetLabel.substring(0, 100) + "..." : targetLabel;

      let username = "Anônimo";
      
      // Try to get username from localStorage or sessionStorage
      try {
        const adminUsername = localStorage.getItem("admin-username");
        if (adminUsername) {
          username = adminUsername;
        } else {
          // Check if operator name is saved
          const sessionData = sessionStorage.getItem("operator-data");
          if (sessionData) {
             const parsed = JSON.parse(sessionData);
             if (parsed.name) username = parsed.name;
          }
        }
      } catch (err) {
        // Ignore parsing errors
      }

      // Send the tracking event without blocking the main thread
      fetch("/api/click", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest"
        },
        body: JSON.stringify({
          action,
          target: cleanLabel,
          url: window.location.pathname,
          username
        })
      }).catch(() => {
        // Silent fail for analytics
      });
    };

    // Use capture phase to ensure we catch the event before any stopPropagation
    document.addEventListener("click", handleClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, [location.pathname]);

  return null;
}
