import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const routes = {
  d: "/",
  p: "/players",
  t: "/tournaments",
  l: "/leaderboard",
  c: "/compare",
  i: "/info",
};

const isTextEntry = (target) => {
  const tag = target?.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable;
};

export const KeyboardShortcuts = () => {
  const navigate = useNavigate();
  const pendingG = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    const clearPending = () => {
      pendingG.current = false;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };

    const onKeyDown = (event) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTextEntry(event.target)) {
        return;
      }

      if (event.key === "/") {
        const input = document.querySelector('[data-testid="search-input"]');
        if (input) {
          event.preventDefault();
          input.focus();
        }
        clearPending();
        return;
      }

      const key = event.key.toLowerCase();
      if (pendingG.current) {
        const route = routes[key];
        clearPending();
        if (route) {
          event.preventDefault();
          navigate(route);
        }
        return;
      }

      if (key === "g") {
        pendingG.current = true;
        timer.current = setTimeout(clearPending, 1200);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearPending();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate]);

  return null;
};
