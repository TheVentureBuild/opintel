/**
 * Every app on the Nexus site, for per-person access control (Nexus Admin > Team).
 *
 * Adding a new app: add it here and wrap it in <AppGate app="key">. On the first visit by a
 * staff member it registers itself in `nexus_apps` and shows up in Nexus Admin flagged "New"
 * until an owner or admin reviews it. The test in src/test/apps.test.ts fails if App.tsx gains
 * a top-level route that is neither listed here nor in PUBLIC_ROUTES.
 */
export type AppKind = "staff" | "member" | "admin";

export interface NexusApp {
  key: string;
  name: string;
  path: string;
  kind: AppKind;
  /** Roles that had access before per-app grants existed. Used only until the DB patch is run. */
  fallbackRoles: readonly string[];
  /** Accounts that had access by email before per-app grants existed (same fallback use). */
  fallbackEmails?: readonly string[];
}

const EDITORS = ["owner", "admin", "editor"] as const;
const STAFF = ["owner", "admin", "editor", "viewer", "collaborator"] as const;

export const NEXUS_APPS: readonly NexusApp[] = [
  { key: "onboarding", name: "Member onboarding", path: "/onboarding", kind: "member", fallbackRoles: STAFF },
  { key: "internal-admin", name: "Nexus Admin", path: "/internal/admin", kind: "admin", fallbackRoles: STAFF },
  { key: "opportunities", name: "Opportunities CRM", path: "/opportunities", kind: "staff", fallbackRoles: STAFF },
  { key: "opintel", name: "Opportunity Intelligence", path: "/opintel", kind: "staff", fallbackRoles: EDITORS },
  { key: "huntylst", name: "Huntlyst", path: "/huntylst", kind: "staff", fallbackRoles: EDITORS },
  { key: "cxoscout", name: "CxOScout", path: "/cxoscout", kind: "staff", fallbackRoles: EDITORS },
  { key: "portfolio-success", name: "Portfolio Success", path: "/portfolio-success", kind: "staff", fallbackRoles: [], fallbackEmails: ["harshal@theventurebuild.com"] },
];

/** Top-level routes in App.tsx that are public pages, redirects or decoys, not apps. */
export const PUBLIC_ROUTES: readonly string[] = [
  "/", "/capitaltable", "/rooms", "/convenings", "/nexus/smaas", "/nexus/baas",
  "/portal/x7f2_nexus_ops", "/admin", "/login", "/dashboard", "/memberonly", "/auth", "/testpage", "*",
  // /tools gates itself to staff and only lists apps; /huntlyst redirects to /huntylst.
  "/tools", "/huntlyst",
];

export const appByKey = (key: string) => NEXUS_APPS.find((a) => a.key === key);
