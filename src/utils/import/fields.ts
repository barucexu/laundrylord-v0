import { ImportField } from "./types";

export const RENTER_FIELDS: ImportField[] = [
  {
    key: "name",
    label: "Name",
    placeholder: "No name yet",
    synonyms: ["full name", "renter name", "customer name", "renter full name", "tenant name"],
  },
  {
    key: "phone",
    label: "Phone",
    placeholder: "No phone yet",
    synonyms: ["phone number", "mobile", "cell", "cell phone", "telephone"],
  },
  {
    key: "email",
    label: "Email",
    placeholder: "No email yet",
    synonyms: ["email address", "e-mail", "email addr"],
  },
  {
    key: "address",
    label: "Address",
    placeholder: "No address yet",
    synonyms: ["service address", "home address", "street address", "location"],
  },
  {
    key: "dryer_outlet",
    label: "Dryer Outlet",
    placeholder: "",
    synonyms: ["outlet", "outlet type", "dryer prong", "prong type"],
  },
  {
    key: "secondary_contact",
    label: "Secondary Contact",
    placeholder: "",
    synonyms: ["alt contact", "alternate contact", "second contact", "emergency contact"],
  },
  {
    key: "language",
    label: "Language",
    placeholder: "",
    synonyms: ["preferred language", "lang"],
  },
  {
    key: "status",
    label: "Status",
    placeholder: "",
    synonyms: ["renter status", "customer status", "account status"],
  },
  {
    key: "lease_start_date",
    label: "Lease Start Date",
    placeholder: "",
    synonyms: ["start date", "lease begins", "lease date", "move in date", "install date"],
  },
  {
    key: "monthly_rate",
    label: "Monthly Rate",
    placeholder: "",
    synonyms: ["monthly rent", "rent", "rate", "monthly rate $", "monthly fee"],
  },
  {
    key: "late_fee",
    label: "Late Fee",
    placeholder: "",
    synonyms: ["late fee $", "late charge", "penalty"],
  },
  {
    key: "install_fee",
    label: "Install Fee",
    placeholder: "",
    synonyms: ["install fee $", "installation fee", "setup fee"],
  },
  {
    key: "deposit_amount",
    label: "Deposit",
    placeholder: "",
    synonyms: ["deposit $", "security deposit", "deposit amount"],
  },
  {
    key: "install_fee_collected",
    label: "Install Fee Collected",
    placeholder: "",
    synonyms: ["install fee paid", "install collected"],
  },
  {
    key: "deposit_collected",
    label: "Deposit Collected",
    placeholder: "",
    synonyms: ["deposit paid", "deposit received"],
  },
  {
    key: "install_notes",
    label: "Install Notes",
    placeholder: "",
    synonyms: ["installation notes", "install info"],
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "",
    synonyms: ["renter notes", "customer notes", "comments"],
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
  },
];

export const MACHINE_FIELDS: ImportField[] = [
  {
    key: "type",
    label: "Type",
    placeholder: "No type yet",
    synonyms: ["machine type", "appliance type", "washer or dryer", "equipment type"],
  },
  {
    key: "model",
    label: "Model",
    placeholder: "No model yet",
    synonyms: ["model number", "model name", "model #"],
  },
  {
    key: "serial",
    label: "Serial #",
    placeholder: "No serial yet",
    synonyms: ["serial number", "serial #", "sn"],
  },
  {
    key: "prong",
    label: "Prong",
    placeholder: "",
    synonyms: ["prong type", "cord type", "plug type"],
  },
  {
    key: "condition",
    label: "Condition",
    placeholder: "",
    synonyms: ["machine condition", "state"],
  },
  {
    key: "status",
    label: "Status",
    placeholder: "",
    synonyms: ["machine status", "availability"],
  },
  {
    key: "cost_basis",
    label: "Cost Basis ($)",
    placeholder: "",
    synonyms: ["cost", "cost basis $", "purchase price", "price", "acquisition cost"],
  },
  {
    key: "sourced_from",
    label: "Sourced From",
    placeholder: "",
    synonyms: ["source", "acquired from", "vendor", "supplier", "purchased from"],
  },
  {
    key: "notes",
    label: "Notes",
    placeholder: "",
    synonyms: ["machine notes", "comments"],
  },
];
