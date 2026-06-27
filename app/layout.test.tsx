import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
  Fraunces: () => ({ variable: "font-fraunces" }),
  Geist: () => ({ variable: "font-geist" }),
  Geist_Mono: () => ({ variable: "font-geist-mono" }),
}));

vi.mock("@/components/landing/site-header", () => ({
  SiteHeader: ({ extras }: { readonly extras?: React.ReactNode }) => (
    <header data-testid="site-header">{extras}</header>
  ),
}));

vi.mock("@/components/header/user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu">User menu</div>,
}));

vi.mock("@/components/observability/web-vitals-reporter", () => ({
  WebVitalsReporter: () => null,
}));

vi.mock("@/components/observability/dev-error-overlay", () => ({
  DevErrorOverlay: () => null,
}));

describe("RootLayout PR7 header integration", () => {
  it("renders UserMenu inside SiteHeader extras", async () => {
    const { default: RootLayout } = await import("./layout");

    const tree = RootLayout({ children: <main>Contenido</main> });
    const body = tree.props.children as React.ReactElement<{
      readonly children: ReadonlyArray<React.ReactElement>;
    }>;
    const bodyChildren = body.props.children;
    const header = bodyChildren[1];

    expect(header.type).toBeTypeOf("function");
    expect(
      (header.props as { readonly extras: React.ReactElement }).extras.type,
    ).toBeTypeOf("function");
  });
});
