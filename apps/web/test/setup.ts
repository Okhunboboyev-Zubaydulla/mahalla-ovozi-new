import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

Object.defineProperty(window, "matchMedia", {
  configurable: true,
  value: (query: string): MediaQueryList => ({
    addEventListener: (): void => undefined,
    addListener: (): void => undefined,
    dispatchEvent: (): boolean => false,
    matches: false,
    media: query,
    onchange: null,
    removeEventListener: (): void => undefined,
    removeListener: (): void => undefined,
  }),
});

afterEach((): void => {
  cleanup();
});
