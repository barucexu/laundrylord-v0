import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeoHead } from "@/components/SeoHead";

describe("SeoHead", () => {
  it("sets canonical metadata for crawlable pages", () => {
    render(
      <SeoHead
        title="Laundry Rental Software"
        description="SEO description"
        canonicalPath="/laundry-rental-software"
        keywords="laundry rental software"
      />,
    );

    expect(document.title).toBe("Laundry Rental Software | LaundryLord");
    expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content")).toBe("SEO description");
    expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe("https://laundrylord.club/laundry-rental-software");
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("index,follow");
  });

  it("supports noindex pages", () => {
    render(
      <SeoHead
        title="Sign In"
        description="Login page"
        canonicalPath="/auth"
        robots="noindex,nofollow"
      />,
    );

    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex,nofollow");
  });
});
