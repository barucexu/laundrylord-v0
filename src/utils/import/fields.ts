import { ImportField } from "./types";

export const RENTER_FIELDS: ImportField[] = [
  {
    key: "name",
    label: "Name",
    placeholder: "No name yet",
    synonyms: ["full name", "renter name", "customer name", "renter full name", "tenant name", "customer", "tenant", "client", "client name"],
    group: "renter",
  },
  {
    key: "phone",
    label: "Phone",
    placeholder: "No phone yet",
    synonyms: ["phone number", "mobile", "cell", "cell phone", "telephone", "tel", "ph", "contact"],
    group: "renter",
  },
  {
    key: "email",
    label: "Email",
    placeholder: "No email yet",
    synonyms: ["email address", "e-mail", "email addr"],
    group: "renter",
  },
  {
    key: "address",
    label: "Address",
    placeholder: "No address yet",
    synonyms: ["service address", "home address", "street address", "location", "addr", "address 1", "delivery address", "install address"],
    group: "renter",
  },
  {
    key: "dryer_outlet",
    label: "Dryer Outlet",
    placeholder: "",
    synonyms: ["outlet", "outlet type", "dryer prong", "prong type", "plug", "plug type"],
    group: "renter",
  },
  {
    key: "secondary_contact",
    label: "Secondary Contact",
    placeholder: "",
    synonyms: ["alt contact", "alternate contact", "second contact", "emergency contact"],
    group: "renter",
  },
  {
    key: "language",
    label: "Language",
    placeholder: "",
    synonyms: ["preferred language", "lang"],
    group: "renter",
  },
  {
    key: "status",
    label: "Status",
    placeholder: "",
    synonyms: ["renter status", "customer status", "account status", "cust status"],
    group: "renter",
  },
  {
    key: "lease_start_date",
    label: "Lease Start Date",
    placeholder: "",
    synonyms: ["start date", "lease begins", "lease date", "move in date", "install date"],
    group: "renter",
  },
  {
    key: "monthly_rate",
    label: "Monthly Rate",
    placeholder: "",
    synonyms: ["monthly rent", "rent", "rate", "monthly rate $", "monthly fee", "monthly", "mo rate", "rent/mo", "rent mo"],
    group: "renter",
  },
  {
    key: "late_fee",
    label: "Late Fee",
    placeholder: "",
    synonyms: ["late fee $", "late charge", "penalty"],
    group: "renter",
  },
  {
    key: "install_fee",
    label: "Install Fee",
    placeholder: "",
    synonyms: ["install fee $", "installation fee", "setup fee"],
    group: "renter",
  },
  {
    key: "deposit_amount",
    label: "Deposit",
    placeholder: "",
    synonyms: ["deposit $", "security deposit", "deposit amount"],
    group: "renter",
  },
  {
    key: "install_fee_collected",
    label: "Install Fee Collected",
    placeholder: "",
    synonyms: ["install fee paid", "install collected"],
    group: "renter",
  },
  {
    key: "deposit_collected",
    label: "Deposit Collected",
    placeholder: "",
    synonyms: ["deposit paid", "deposit received"],
    group: "renter",
  },
  {
    key: "install_notes",
    label: "Install Notes",
    placeholder: "",
    synonyms: ["installation notes", "install info"],
    group: "renter",
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "",
    synonyms: ["renter notes", "customer notes", "comments", "comment"],
    group: "renter",
  },
  {
    key: "has_payment_method",
    label: "Card Set Up but no Autopay",
    placeholder: "",
    synonyms: [
      "card on file no autopay",
      "card added no autopay",
      "card set up no autopay",
      "payment method",
      "card on file",
    ],
    group: "renter",
  },
];

export const MACHINE_FIELDS: ImportField[] = [
  {
    key: "type",
    label: "Type",
    placeholder: "No type yet",
    synonyms: ["machine type", "appliance type", "washer or dryer", "equipment type", "make", "appliance", "w/d", "washer dryer"],
    group: "machine",
  },
  {
    key: "model",
    label: "Model",
    placeholder: "No model yet",
    synonyms: ["model number", "model name", "model #"],
    group: "machine",
  },
  {
    key: "serial",
    label: "Serial #",
    placeholder: "No serial yet",
    synonyms: ["serial number", "serial #", "sn"],
    group: "machine",
  },
  {
    key: "prong",
    label: "Prong",
    placeholder: "",
    synonyms: ["prong type", "cord type", "plug type"],
    group: "machine",
  },
  {
    key: "condition",
    label: "Condition",
    placeholder: "",
    synonyms: ["machine condition", "state"],
    group: "machine",
  },
  {
    key: "status",
    label: "Status",
    placeholder: "",
    synonyms: ["machine status", "availability"],
    group: "machine",
  },
  {
    key: "cost_basis",
    label: "Cost Basis ($)",
    placeholder: "",
    synonyms: ["cost", "cost basis $", "purchase price", "price", "acquisition cost"],
    group: "machine",
  },
  {
    key: "sourced_from",
    label: "Sourced From",
    placeholder: "",
    synonyms: ["source", "acquired from", "vendor", "supplier", "purchased from"],
    group: "machine",
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "",
    synonyms: ["machine notes", "comments"],
    group: "machine",
  },
];

// Combined fields with prefixed keys for disambiguation
export function getCombinedFields(): ImportField[] {
  const COLLIDING_KEYS = ["status", "notes"];

  const renterCombined = RENTER_FIELDS.map((f) => {
    if (COLLIDING_KEYS.includes(f.key)) {
      return {
        ...f,
        key: `renter.${f.key}`,
        label: f.key === "status" ? "Renter Status" : "Renter Notes",
      };
    }
    return { ...f };
  });

  const machineCombined = MACHINE_FIELDS.map((f) => {
    if (COLLIDING_KEYS.includes(f.key)) {
      return {
        ...f,
        key: `machine.${f.key}`,
        label: f.key === "status" ? "Machine Status" : "Machine Notes",
      };
    }
    return { ...f };
  });

  return [...renterCombined, ...machineCombined];
}

// Resolve a combined prefixed key back to the real DB column name
export function resolveFieldKey(prefixedKey: string): string {
  if (prefixedKey.startsWith("renter.")) return prefixedKey.slice(7);
  if (prefixedKey.startsWith("machine.")) return prefixedKey.slice(8);
  return prefixedKey;
}
