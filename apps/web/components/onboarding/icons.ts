import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  ArrowRight,
  BarChart3,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Dumbbell,
  Eye,
  EyeOff,
  Flag,
  Gauge,
  Info,
  Lock,
  Mail,
  Map,
  Moon,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Sun,
  Timer,
  TrendingUp,
  User,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react"

/**
 * Ionicons glyph name → lucide equivalent.
 *
 * The mobile flow is written against Ionicons names, so the port keeps those
 * names and resolves them here. Every icon decision in the flow stays
 * reviewable in one file, and the two implementations can still be diffed
 * line for line.
 */
export const ICONS = {
  "flash-outline": Zap,
  "map-outline": Map,
  "people-outline": Users,
  "stats-chart-outline": BarChart3,
  "time-outline": Clock,
  "person-outline": User,
  "checkmark-circle": CheckCircle2,
  "lock-closed-outline": Lock,
  "options-outline": SlidersHorizontal,
  "swap-horizontal-outline": ArrowLeftRight,
  "sparkles-outline": Sparkles,
  "refresh-outline": RotateCcw,
  "trending-up-outline": TrendingUp,
  "timer-outline": Timer,
  "speedometer-outline": Gauge,
  "barbell-outline": Dumbbell,
  "color-palette-outline": Palette,
  "phone-portrait-outline": Smartphone,
  "sunny-outline": Sun,
  "moon-outline": Moon,
  "checkmark-done-outline": CheckCheck,
  "alert-circle-outline": AlertCircle,
  "information-circle-outline": Info,
  "mail-outline": Mail,
  "eye-outline": Eye,
  "eye-off-outline": EyeOff,
  "arrow-forward": ArrowRight,
  "arrow-back": ArrowLeft,
  "chevron-forward": ChevronRight,
  "flag-outline": Flag,
  "checkmark": Check,
} satisfies Record<string, LucideIcon>

export type IconName = keyof typeof ICONS
