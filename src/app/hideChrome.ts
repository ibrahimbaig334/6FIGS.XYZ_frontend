"use client";

// TEMPORARY: hides the app's shared chrome (ticker, masthead, footer) on the
// capture pages so screenshots contain only the component under capture.
import { useEffect } from "react";

export function useHideChrome(paper = "#f4efdf") {
  useEffect(() => {
    ["header.masthead", ".ticker", ".site-footer", "footer"].forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((e) => {
        e.style.display = "none";
      });
    });
    document.body.style.background = paper;
  }, [paper]);
}
