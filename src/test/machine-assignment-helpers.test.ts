import { describe, expect, it } from "vitest";
import {
  getUnassignedMachineStatus,
  isMachineAssignable,
  normalizeEditableMachineStatus,
} from "@/lib/machine-assignment";

describe("machine assignment helpers", () => {
  describe("isMachineAssignable", () => {
    it("requires no assigned renter and available status", () => {
      expect(isMachineAssignable({ assigned_renter_id: null, status: "available" })).toBe(true);
    });

    it("rejects assigned machines", () => {
      expect(isMachineAssignable({ assigned_renter_id: "renter-1", status: "available" })).toBe(false);
      expect(isMachineAssignable({ assigned_renter_id: "renter-1", status: "assigned" })).toBe(false);
    });

    it("rejects unavailable canonical and legacy statuses", () => {
      expect(isMachineAssignable({ assigned_renter_id: null, status: "assigned" })).toBe(false);
      expect(isMachineAssignable({ assigned_renter_id: null, status: "maintenance" })).toBe(false);
      expect(isMachineAssignable({ assigned_renter_id: null, status: "retired" })).toBe(false);
      expect(isMachineAssignable({ assigned_renter_id: null, status: "rented" })).toBe(false);
    });
  });

  describe("getUnassignedMachineStatus", () => {
    it("maps assigned and legacy rented to available", () => {
      expect(getUnassignedMachineStatus("assigned")).toBe("available");
      expect(getUnassignedMachineStatus("rented")).toBe("available");
    });

    it("preserves maintenance and retired", () => {
      expect(getUnassignedMachineStatus("maintenance")).toBe("maintenance");
      expect(getUnassignedMachineStatus("retired")).toBe("retired");
    });
  });

  describe("normalizeEditableMachineStatus", () => {
    it("maps legacy rented to assigned", () => {
      expect(normalizeEditableMachineStatus("rented")).toBe("assigned");
    });

    it("leaves canonical statuses unchanged", () => {
      expect(normalizeEditableMachineStatus("available")).toBe("available");
      expect(normalizeEditableMachineStatus("assigned")).toBe("assigned");
      expect(normalizeEditableMachineStatus("maintenance")).toBe("maintenance");
      expect(normalizeEditableMachineStatus("retired")).toBe("retired");
    });
  });
});
