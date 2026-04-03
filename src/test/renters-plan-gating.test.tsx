import { render } from "@testing-library/react";
import { fireEvent, screen } from "@testing-library/dom";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RentersList from "@/pages/RentersList";

const mockUseSubscription = vi.fn();

vi.mock("@/hooks/useSupabaseData", () => ({
  useRenters: () => ({
    data: [{ id: "renter-1", name: "Alice", phone: "555-1111", status: "active", balance: 0, paid_through_date: null, days_late: 0 }],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => mockUseSubscription(),
}));

vi.mock("@/components/CreateRenterDialog", () => ({
  CreateRenterDialog: ({ open }: { open: boolean }) => (open ? <div>create-renter-dialog-open</div> : null),
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <RentersList />
    </MemoryRouter>,
  );
}

describe("RentersList plan gating", () => {
  beforeEach(() => {
    mockUseSubscription.mockReset();
  });

  it("shows a Starter upgrade prompt for free users at 10 billable renters", async () => {
    mockUseSubscription.mockReturnValue({
      canAddRenter: false,
      billableCount: 10,
      capacityTier: { name: "Free", price: 0 },
      nextUpgradeTier: { name: "Starter", label: "$29/mo", price_id: "starter-price" },
      checkout: vi.fn(),
      loading: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Add Renter/i }));

    expect(await screen.findByText("You've grown to 10 billable renters!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade to Starter ($29/mo)" })).toBeInTheDocument();
  });

  it("opens the create dialog for Starter users who still have capacity", async () => {
    mockUseSubscription.mockReturnValue({
      canAddRenter: true,
      billableCount: 10,
      capacityTier: { name: "Starter", price: 29 },
      nextUpgradeTier: null,
      checkout: vi.fn(),
      loading: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Add Renter/i }));

    expect(await screen.findByText("create-renter-dialog-open")).toBeInTheDocument();
    expect(screen.queryByText("Upgrade to Starter ($29/mo)")).not.toBeInTheDocument();
  });

  it("shows a Growth upgrade prompt once Starter capacity is full", async () => {
    mockUseSubscription.mockReturnValue({
      canAddRenter: false,
      billableCount: 24,
      capacityTier: { name: "Starter", price: 29 },
      nextUpgradeTier: { name: "Growth", label: "$49/mo", price_id: "growth-price" },
      checkout: vi.fn(),
      loading: false,
    });

    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /Add Renter/i }));

    expect(await screen.findByText("You've grown to 24 billable renters!")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Upgrade to Growth ($49/mo)" })).toBeInTheDocument();
  });
});
