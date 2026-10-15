import {
  Activity,
  Compass,
  FileUp,
  MapPin,
  PenSquare,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import type { NavDestination } from "./nav-primitives"

export type NavChild = NavDestination & { icon: LucideIcon }

export type NavGroup = {
  id: string
  label: string
  icon: LucideIcon
  /** Path prefixes that mark this group as the current section. */
  matches: string[]
  children: NavChild[]
}

// One nav model for the desktop bar, its dropdowns and the mobile sheet, so a
// route is added in one spot. `matches` holds path prefixes, so "Feed" stays
// current on an individual activity rather than flickering between siblings.
export const NAV_GROUPS: NavGroup[] = [
  {
    id: "feed",
    label: "Feed",
    icon: Activity,
    matches: ["/dashboard", "/activities"],
    children: [
      {
        label: "Activity feed",
        href: "/dashboard",
        detail: "Latest from your athletes",
        icon: Activity,
      },
      {
        label: "My activities",
        href: "/activities",
        detail: "Everything you have logged",
        icon: Compass,
      },
      {
        label: "Routes & segments",
        href: "/maps",
        detail: "Draw and explore your lines",
        icon: MapPin,
      },
    ],
  },
  {
    id: "training",
    label: "Training",
    icon: Trophy,
    matches: ["/upload"],
    children: [
      {
        label: "Training log",
        href: "/upload",
        detail: "Upload a file or add it by hand",
        icon: FileUp,
      },
      {
        label: "Weekly goals",
        href: "/dashboard",
        detail: "What you are working towards",
        icon: Trophy,
      },
    ],
  },
]

/** Single-destination items, rendered as plain links rather than dropdowns. */
export const NAV_LINKS: NavDestination[] = [
  { label: "Maps", href: "/maps" },
  { label: "Challenges", href: "/dashboard" },
]

/** The one saturated action in the header. */
export const CREATE_ACTIONS: NavChild[] = [
  {
    label: "Upload activity",
    detail: "Import a .gpx or .fit file",
    href: "/upload/file",
    icon: FileUp,
  },
  {
    label: "Add manual entry",
    detail: "Log a run you did elsewhere",
    href: "/upload/manual",
    icon: PenSquare,
  },
  {
    label: "Draw a route",
    detail: "Sketch a line on the map",
    href: "/maps",
    icon: MapPin,
  },
]

/** Matches path prefixes. Scoped past the root so `/uploading` cannot light up "Training". */
export function isCurrent(pathname: string, matches: string[]) {
  return matches.some((path) => pathname === path || pathname.startsWith(`${path}/`))
}