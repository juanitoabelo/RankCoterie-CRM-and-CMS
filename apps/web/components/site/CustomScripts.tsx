"use client";

import { useEffect, useRef } from "react";

function executeScripts(container: HTMLElement) {
  const scripts = Array.from(container.querySelectorAll("script"));

  for (const oldScript of scripts) {
    const script = document.createElement("script");

    for (const attribute of Array.from(oldScript.attributes)) {
      script.setAttribute(attribute.name, attribute.value);
    }

    script.text = oldScript.textContent ?? "";
    oldScript.replaceWith(script);
  }
}

export default function CustomScripts({ html }: { html: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const injectedHtmlRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!container || injectedHtmlRef.current === html) {
      return;
    }

    injectedHtmlRef.current = html;
    container.replaceChildren();

    if (!html.trim()) {
      return;
    }

    if (!/<script[\s>]/i.test(html)) {
      const script = document.createElement("script");
      script.text = html;
      container.appendChild(script);
      return;
    }

    const documentFragment = new DOMParser().parseFromString(html, "text/html");
    const nodes = [
      ...Array.from(documentFragment.head.childNodes),
      ...Array.from(documentFragment.body.childNodes),
    ];

    for (const node of nodes) {
      container.appendChild(document.importNode(node, true));
    }

    executeScripts(container);
  }, [html]);

  return <div ref={containerRef} hidden aria-hidden="true" />;
}
