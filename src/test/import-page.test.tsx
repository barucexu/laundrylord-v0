import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { fireEvent, screen, waitFor } from "@testing-library/dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ImportPage from "@/pages/ImportPage";

const mockParseCSV = vi.fn();
const mockInsert = vi.fn();
const mockUpsert = vi.fn();
const mockSelect = vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: "row-1" }, error: null })) }));
const mockInsertBuilder = {
  select: mockSelect,
  single: vi.fn(async () => ({ data: { id: "row-1" }, error: null })),
};
const mockFrom = vi.fn((table: string) => {
  if (table === "renters" || table === "machines") {
    return {
      insert: (...args: unknown[]) => {
        mockInsert(...args);
        return mockInsertBuilder;
      },
    };
  }

  return {
    upsert: (...args: unknown[]) => {
      mockUpsert(...args);
      return mockInsertBuilder;
    },
  };
});
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();
const mockSubscriptionState = {
  tier: { max: 10, price: 0 },
  renterCount: 0,
  billableCount: 0,
  subscribed: false,
  loading: false,
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/hooks/useSubscription", () => ({
  useSubscription: () => mockSubscriptionState,
}));

vi.mock("@/utils/import/csv-parser", () => ({
  parseCSV: (...args: unknown[]) => mockParseCSV(...args),
}));

vi.mock("@/utils/import/xlsx-parser", () => ({
  parseXLSX: vi.fn(),
}));

vi.mock("@/utils/import/image-parser", () => ({
  parseImage: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => mockFrom(table),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <ImportPage />
    </QueryClientProvider>,
  );
}

async function uploadCsv(container: HTMLElement, fileName = "import.csv") {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  expect(input).toBeTruthy();

  fireEvent.change(input, {
    target: {
      files: [new File(["name"], fileName, { type: "text/csv" })],
    },
  });

  await screen.findByText("Map Columns");
}

describe("ImportPage", () => {
  beforeEach(() => {
    mockParseCSV.mockReset();
    mockInsert.mockReset();
    mockUpsert.mockReset();
    mockSelect.mockClear();
    mockFrom.mockClear();
    mockToastError.mockReset();
    mockToastSuccess.mockReset();
    mockInsert.mockResolvedValue({ error: null });
    mockSubscriptionState.tier = { max: 10, price: 0 };
    mockSubscriptionState.renterCount = 0;
    mockSubscriptionState.billableCount = 0;
    mockSubscriptionState.subscribed = false;
    mockSubscriptionState.loading = false;
  });

  it("shows the preview notice and paginates all non-empty rows", async () => {
    mockParseCSV.mockResolvedValue({
      headers: ["Name"],
      rows: Array.from({ length: 30 }, (_, index) => [`Renter ${index + 1}`]),
      sourceType: "csv",
    });

    const { container } = renderPage();
    await uploadCsv(container);

    fireEvent.click(screen.getByRole("button", { name: "Preview Import" }));

    expect(await screen.findByText("Custom columns will be created as custom fields. Invalid mapped values should be reviewed before import.")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument();
    expect(screen.getByText("Renter 1")).toBeInTheDocument();
    expect(screen.queryByText("Renter 26")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Next" }));

    expect(await screen.findByText("Page 2 of 2")).toBeInTheDocument();
    expect(screen.getByText("Renter 26")).toBeInTheDocument();
  });

  it("toggles remove and undo in preview", async () => {
    mockParseCSV.mockResolvedValue({
      headers: ["Name"],
      rows: [["Alice"]],
      sourceType: "csv",
    });

    const { container } = renderPage();
    await uploadCsv(container);

    fireEvent.click(screen.getByRole("button", { name: "Preview Import" }));
    await screen.findByText("Alice");

    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(await screen.findByText("Removed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Undo/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Undo/i }));
    expect(await screen.findByText("Ready")).toBeInTheDocument();
  });

  it("does not query for duplicates during preview and excludes removed rows from import payload", async () => {
    mockParseCSV.mockResolvedValue({
      headers: ["Name"],
      rows: [["Alice"], ["Bob"]],
      sourceType: "csv",
    });

    const { container } = renderPage();
    await uploadCsv(container);

    fireEvent.click(screen.getByRole("button", { name: "Preview Import" }));
    await screen.findByText("Alice");

    expect(mockFrom).not.toHaveBeenCalled();

    fireEvent.click(screen.getAllByRole("button", { name: /Remove/i })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Import 1 Rows" }));

    await screen.findByRole("button", { name: "Import More" });

    expect(mockFrom).toHaveBeenCalledTimes(1);
    expect(mockFrom).toHaveBeenCalledWith("renters");
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(mockInsert.mock.calls[0][0]).toMatchObject({ name: "Bob", user_id: "user-1" });
    expect(screen.getAllByText((_, element) => element?.textContent === "1 deleted by operator").length).toBeGreaterThan(0);
    expect(mockToastSuccess).toHaveBeenCalled();

    await waitFor(() => {
      expect(mockToastError).not.toHaveBeenCalled();
    });
  });

  it("shows a blocked-by-plan preview message when the free tier is already full", async () => {
    mockSubscriptionState.renterCount = 10;
    mockSubscriptionState.billableCount = 10;

    mockParseCSV.mockResolvedValue({
      headers: ["Name"],
      rows: [["Alice"], ["Bob"]],
      sourceType: "csv",
    });

    const { container } = renderPage();
    await uploadCsv(container);

    fireEvent.click(screen.getByRole("button", { name: "Preview Import" }));

    expect(
      await screen.findByText("Your plan has no renter slots remaining. All renter rows in this import will be blocked by plan."),
    ).toBeInTheDocument();
  });
});
