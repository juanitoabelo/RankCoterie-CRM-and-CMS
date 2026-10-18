"use client";

/**
 * Google reCAPTCHA v3 loader + generic form guard.
 *
 * Rendered once in the site layout when a site key is configured. It loads the
 * v3 script, then intercepts the submit of any form carrying a `data-recaptcha`
 * attribute: it fetches a fresh token, injects it into a hidden
 * `recaptchaToken` field, and re-submits. Server routes verify the token with
 * `verifyRecaptchaToken` (lib/recaptcha.ts).
 */
import { useEffect } from "react";

declare global {
  interface Window {
    grecaptcha?: {
      ready: (cb: () => void) => void;
      execute: (siteKey: string, opts: { action: string }) => Promise<string>;
    };
  }
}

export default function RecaptchaProvider({ siteKey }: { siteKey: string }) {
  useEffect(() => {
    if (!siteKey) return;

    if (!document.querySelector("script[data-recaptcha-v3]")) {
      const script = document.createElement("script");
      script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
      script.async = true;
      script.defer = true;
      script.setAttribute("data-recaptcha-v3", "1");
      document.head.appendChild(script);
    }

    const onSubmit = (event: Event) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (!form.hasAttribute("data-recaptcha")) return;
      if (form.dataset.recaptchaDone === "1") return;

      const grecaptcha = window.grecaptcha;
      if (!grecaptcha) return; // script not ready — let the native submit proceed

      event.preventDefault();
      grecaptcha.ready(() => {
        grecaptcha
          .execute(siteKey, { action: "submit" })
          .then((token) => {
            let input = form.querySelector<HTMLInputElement>('input[name="recaptchaToken"]');
            if (!input) {
              input = document.createElement("input");
              input.type = "hidden";
              input.name = "recaptchaToken";
              form.appendChild(input);
            }
            input.value = token;
            form.dataset.recaptchaDone = "1";
            form.submit();
          })
          .catch(() => {
            form.submit();
          });
      });
    };

    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
  }, [siteKey]);

  return null;
}
