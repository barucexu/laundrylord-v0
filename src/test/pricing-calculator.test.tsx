import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PricingCalculator } from "@/components/PricingCalculator";

describe("PricingCalculator", () => {
  it("renders the open-ended Ultimate tier without fake zero or Infinity math", () => {
    render(<PricingCalculator />);

    expect(screen.getByText("1,000+ renters")).toBeInTheDocument();
    expect(screen.getByText("Est. gross revenue: $60.0k+/mo")).toBeInTheDocument();
    expect(screen.getByText("At most $1.00/renter at 1,000 renters")).toBeInTheDocument();
    expect(screen.getByText("Typically 1.7% or less of gross revenue")).toBeInTheDocument();
    expect(screen.queryByText(/0\.00\/renter/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$0\/mo/)).not.toBeInTheDocument();
  });
});
