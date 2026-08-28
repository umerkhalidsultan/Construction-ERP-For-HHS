import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi, describe, expect, it } from "vitest";
import { TenderListPage } from "./TenderListPage";

vi.mock("../../services/tenders.service", () => ({
  listTenders: vi
    .fn()
    .mockResolvedValue({
      data: [
        {
          id: "tender-a",
          tenderNumber: "TND-2026-000001",
          title: "Airport Terminal",
          clientCompany: { id: "client-a", name: "Airport Authority" },
          tenderType: "Open",
          closingDate: "2026-10-01",
          currency: "PKR",
          estimatedValue: "1000.00",
          priority: "HIGH",
          status: "DRAFT",
        },
      ],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
}));
vi.mock("../../services/crm.service", () => ({
  listCrmCompanies: vi.fn().mockResolvedValue({ data: [] }),
}));

describe("TenderListPage", () => {
  it("renders server-provided Tender data and a safe empty-ready search UI", async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/companies/company-a/tenders"]}>
          <Routes>
            <Route
              path="/companies/:companyId/tenders"
              element={<TenderListPage />}
            />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    expect((await screen.findAllByText("TND-2026-000001")).length).toBe(2);
    expect(screen.getAllByText("Airport Terminal")).toHaveLength(2);
    expect(screen.getByLabelText("Search")).toBeInTheDocument();
  });
});
