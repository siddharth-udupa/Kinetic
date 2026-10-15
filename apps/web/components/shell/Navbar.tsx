"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Plus,
  Search,
  Settings,
  User,
  X,
  Zap,
} from "lucide-react"
import { useSession, signOut } from "@/lib/auth-client"
import { APP_NAME } from "@repo/shared"
import { useTheme } from "@/hooks/useTheme"
import {
  Avatar,
  BrandMark,
  FOCUS,
  NavDivider,
  NavPanel,
  NavRow,
  NavSectionLabel,
} from "./nav-primitives"
import { CREATE_ACTIONS, NAV_GROUPS, NAV_LINKS, isCurrent, type NavChild } from "./nav-model"

/** Which panel is open. One at a time — they would otherwise overlap. */
type OpenPanel = "feed" | "training" | "create" | "account" | "search" | null

/**
 * The app header.
 *
 * Draws from the onboarding theme's tokens — `AppShell` publishes them as
 * `--color-*` on the shell wrapper above — so it is the same object in light and
 * dark, and visually continuous with the onboarding and auth screens it links
 * into.
 */
export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { colors } = useTheme()

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  /* `document` is read to portal the mobile sheet out of the header, and does
     not exist while server-rendering. */
  const [mounted, setMounted] = useState(false)

  const headerRef = useRef<HTMLElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  const user = session?.user

  useEffect(() => setMounted(true), [])

  /* Close on an outside click. Bound to `mousedown` rather than `click` so the
     panel closes under the same gesture that opened whatever was on top of it,
     instead of waiting for the mouse to be released. */
  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpenPanel(null)
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  /* Every panel is a transient affordance tied to a route, so navigating away
     has to dismiss all of them — otherwise the mobile sheet survives the
     navigation it was opened for and covers the page it just revealed.

     `pathname` is the trigger and is not read in the body; the setters are
     stable, so the effect fires exactly once per navigation. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger, not a read dependency
  useEffect(() => {
    setOpenPanel(null)
    setMobileOpen(false)
  }, [pathname])

  /* Escape closes the topmost thing. The mobile sheet wins over a panel,
     because it is the one covering the page. */
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return
      if (mobileOpen) {
        setMobileOpen(false)
        return
      }
      setOpenPanel(null)
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [mobileOpen])

  useEffect(() => {
    if (openPanel === "search") searchRef.current?.focus()
  }, [openPanel])

  /* Scrolling behind the sheet keeps it from being dragged along by the page. */
  useEffect(() => {
    if (!mobileOpen) return

    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = previous
    }
  }, [mobileOpen])

  /* Widened at the boundary because `NAV_GROUPS` types `id` as a plain string:
     the model is shared with the mobile nav, which has no panels at all. The
     union is what keeps a typo in a panel name a compile error. */
  function togglePanel(next: string) {
    setOpenPanel((current) => (current === next ? null : (next as OpenPanel)))
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const query = searchQuery.trim()
    if (!query) return

    router.push(`/dashboard?search=${encodeURIComponent(query)}`)
    setOpenPanel(null)
    setMobileOpen(false)
    setSearchQuery("")
  }

  async function handleSignOut() {
    setOpenPanel(null)
    setMobileOpen(false)
    await signOut()
    router.push("/auth")
  }

  /*
   * One definition, rendered in two places: inline on wide viewports and inside
   * the mobile sheet. `id` is suffixed per instance so the label still points at
   * its own input — two elements sharing one id would leave the sheet's label
   * bound to the inline field, which is not even on screen when it is used.
   */
  /*
   * `focusRef` is the ref *object*, typed by inference rather than an explicit
   * `React.Ref<…>`: the workspace resolves two copies of `@types/react`, and an
   * annotation written here is structurally incompatible with the one
   * `useRef` infers. Passing the object sidesteps the collision.
   */
  const searchField = (idSuffix: string, focusRef?: { current: HTMLInputElement | null }) => (
    // A plain <form>: it is not a landmark here, and adding `role="search"`
    // would put one on every rendered instance of this field.
    <form onSubmit={handleSearchSubmit}>
      <label htmlFor={`nav-search-${idSuffix}`} className="sr-only">
        Search activities and athletes
      </label>
      <div
        className="flex h-11 items-center gap-2.5 rounded-xl border px-3.5 transition-colors focus-within:border-accent"
        style={{ backgroundColor: colors.surface, borderColor: colors.line }}
      >
        <Search size={17} strokeWidth={2} style={{ color: colors.inkMuted }} aria-hidden />
        <input
          ref={focusRef}
          id={`nav-search-${idSuffix}`}
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search activities, athletes"
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-ink-muted"
          style={{ color: colors.ink }}
        />
      </div>
    </form>
  )

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.line,
        // The blur is doing the separating, so the surface only needs to be
        // near-opaque — fully transparent would let a scrolled card show
        // through the wordmark.
        background: `color-mix(in srgb, ${colors.surface} 88%, transparent)`,
      }}
    >
      {/* The container is `xl` rather than `max-w-7xl`: at 1280px and up the
          bar has room for the sections, the search field and the account
          cluster without the groups crowding the wordmark. */}
      <div className="mx-auto w-full max-w-400 px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center gap-3 lg:h-16 lg:gap-5">
          {/* ── Brand ── */}
          <Link
            href={user ? "/dashboard" : "/"}
            className={`shrink-0 rounded-xl ${FOCUS}`}
            aria-label={`${APP_NAME} home`}
          >
            <BrandMark
              name={APP_NAME}
              icon={<Zap size={Math.round(34 * 0.46)} strokeWidth={2} style={{ color: colors.accent }} />}
            />
          </Link>

          {/* ── Primary sections ── */}
          <nav className="hidden min-w-0 flex-1 items-center gap-1 lg:flex" aria-label="Primary">
            {NAV_GROUPS.map((group) => {
              const current = isCurrent(pathname, group.matches)
              const Icon = group.icon

              return (
                <div key={group.id} className="relative">
                  <button
                    type="button"
                    onClick={() => togglePanel(group.id)}
                    aria-expanded={openPanel === group.id}
                    aria-haspopup="true"
                    className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-[14px] font-semibold transition ${FOCUS} ${
                      current || openPanel === group.id
                        ? "bg-accent-soft"
                        : "hover:bg-surface-muted"
                    }`}
                    style={{ color: current ? colors.accentText : colors.inkSecondary }}
                  >
                    <Icon size={17} strokeWidth={2} aria-hidden />
                    {group.label}
                    <ChevronDown
                      size={14}
                      strokeWidth={2.4}
                      aria-hidden
                      className={`transition-transform duration-200 ${
                        openPanel === group.id ? "rotate-180" : ""
                      }`}
                      style={{ color: colors.inkMuted }}
                    />
                  </button>

                  {openPanel === group.id ? (
                    <NavPanel className="absolute top-full left-0 mt-2 w-72">
                      {group.children.map((child) => (
                        <NavRow key={child.label} {...toRowProps(child)} />
                      ))}
                    </NavPanel>
                  ) : null}
                </div>
              )
            })}

            {NAV_LINKS.map((link) => {
              const current = isCurrent(pathname, [link.href])

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className={`flex h-10 items-center rounded-xl px-3.5 text-[14px] font-semibold transition ${FOCUS} ${
                    current ? "bg-accent-soft" : "hover:bg-surface-muted"
                  }`}
                  style={{ color: current ? colors.accentText : colors.inkSecondary }}
                  aria-current={current ? "page" : undefined}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* ── Search: an inline field once there is room for it, a panel below
                 that, so it never squeezes the sections off the bar. ── */}
          <div className="ml-auto hidden w-64 xl:block">{searchField("inline")}</div>

          {/* ── Actions ── */}
          <div className="ml-auto flex items-center gap-1.5 xl:ml-0">
            <button
              type="button"
              aria-label="Search"
              onClick={() => togglePanel("search")}
              className={`flex size-10 cursor-pointer items-center justify-center rounded-xl transition ${FOCUS} hover:bg-surface-muted xl:hidden`}
              style={{ color: colors.inkSecondary }}
            >
              <Search size={19} strokeWidth={2} aria-hidden />
            </button>

            <button
              type="button"
              aria-label="Notifications"
              className={`relative hidden size-10 cursor-pointer items-center justify-center rounded-xl transition sm:flex ${FOCUS} hover:bg-surface-muted`}
              style={{ color: colors.inkSecondary }}
            >
              <Bell size={19} strokeWidth={2} aria-hidden />
              <span
                className="absolute top-2.5 right-2.5 size-2 rounded-full"
                style={{ backgroundColor: colors.accent, outline: `2px solid ${colors.surface}` }}
              />
            </button>

            {user ? (
              <>
                {/* The one saturated surface in the header — the same rule the
                    onboarding flow follows, where each screen has a single
                    accent-filled control. */}
                <div className="relative hidden lg:block">
                  <button
                    type="button"
                    onClick={() => togglePanel("create")}
                    aria-expanded={openPanel === "create"}
                    aria-haspopup="true"
                    className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition active:opacity-80 ${FOCUS}`}
                    style={{ backgroundColor: colors.accent, color: colors.onAccent }}
                  >
                    <Plus size={17} strokeWidth={2.6} aria-hidden />
                    Log
                    <ChevronDown
                      size={14}
                      strokeWidth={2.4}
                      aria-hidden
                      className={`transition-transform duration-200 ${
                        openPanel === "create" ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {openPanel === "create" ? (
                    <NavPanel className="absolute top-full right-0 mt-2 w-72">
                      {CREATE_ACTIONS.map((action) => (
                        <NavRow key={action.label} {...toRowProps(action)} />
                      ))}
                    </NavPanel>
                  ) : null}
                </div>

                <div className="relative hidden lg:block">
                  <button
                    type="button"
                    onClick={() => togglePanel("account")}
                    aria-expanded={openPanel === "account"}
                    aria-haspopup="true"
                    aria-label="Account menu"
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full p-1 transition ${FOCUS} hover:bg-surface-muted`}
                  >
                    <Avatar src={user.image} name={user.name} />
                    <ChevronDown
                      size={14}
                      strokeWidth={2.4}
                      aria-hidden
                      style={{ color: colors.inkMuted }}
                    />
                  </button>

                  {openPanel === "account" ? (
                    <NavPanel className="absolute top-full right-0 mt-2 w-64">
                      <div className="px-4 py-4">
                        <p
                          className="truncate text-[14px] font-bold"
                          style={{ color: colors.ink }}
                        >
                          {user.name || "Athlete"}
                        </p>
                        <p className="mt-0.5 truncate text-[12px]" style={{ color: colors.inkMuted }}>
                          {user.email}
                        </p>
                      </div>

                      <NavDivider />

                      <NavRow
                        href="/dashboard"
                        icon={<User size={17} strokeWidth={2} aria-hidden />}
                        label="My profile"
                        chevron
                      />
                      <NavRow
                        href="/onboarding"
                        icon={<Settings size={17} strokeWidth={2} aria-hidden />}
                        label="Settings & preferences"
                        chevron
                      />

                      <NavDivider />

                      <NavRow
                        onClick={handleSignOut}
                        icon={<LogOut size={17} strokeWidth={2} aria-hidden />}
                        label="Sign out"
                        tone="danger"
                      />
                    </NavPanel>
                  ) : null}
                </div>
              </>
            ) : (
              <Link
                href="/auth"
                className={`hidden h-10 items-center rounded-xl px-4 text-[14px] font-semibold transition ${FOCUS} lg:flex`}
                style={{ backgroundColor: colors.accent, color: colors.onAccent }}
              >
                Sign in
              </Link>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((current) => !current)}
              aria-expanded={mobileOpen}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              className={`flex size-10 cursor-pointer items-center justify-center rounded-xl transition lg:hidden ${FOCUS} hover:bg-surface-muted`}
              style={{ color: colors.inkSecondary }}
            >
              {mobileOpen ? (
                <X size={21} strokeWidth={2} aria-hidden />
              ) : (
                <Menu size={21} strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Search panel, below `xl` ── */}
      {openPanel === "search" ? (
        <div className="border-t px-4 py-3 sm:px-6 lg:px-8 xl:hidden" style={{ borderColor: colors.line }}>
          <div className="mx-auto w-full max-w-400">{searchField("panel", searchRef)}</div>
        </div>
      ) : null}

      {/* Portalled: the header carries `backdrop-blur`, and a backdrop filter
          makes its box the containing block for `position: fixed` descendants —
          so a sheet rendered in place resolves `inset-0` against the 56px header
          rather than the viewport, collapsing to header height. Rendering into
          `document.body` takes it outside that block entirely.

          Gated on `mounted` because `document` does not exist during SSR. The
          sheet is closed on the server anyway, so nothing is lost by waiting. */}
      {mounted && mobileOpen
        ? createPortal(
            <MobileSheet
              searchField={searchField("sheet")}
              user={user}
              onClose={() => setMobileOpen(false)}
              onSignOut={handleSignOut}
            />,
            document.body,
          )
        : null}
    </header>
  )
}

/**
 * The full-height mobile menu.
 *
 * Owns the viewport rather than hanging off the header, so every section can be
 * listed flat — the old overlay used accordions, which meant a section had to be
 * expanded before it could be read, and the panel clipped once its content
 * outgrew the remaining height.
 */
function MobileSheet({
  searchField,
  user,
  onClose,
  onSignOut,
}: {
  searchField: React.ReactNode
  /** `NonNullable<typeof user>` from the session, so this stays in step with it. */
  user: { name?: string | null; email?: string | null; image?: string | null } | null | undefined
  onClose: () => void
  onSignOut: () => void
}) {
  const { colors } = useTheme()

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      style={{ backgroundColor: colors.surface }}
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
    >
      <div className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Link
          href={user ? "/dashboard" : "/"}
          onClick={onClose}
          className={`rounded-xl ${FOCUS}`}
          aria-label={`${APP_NAME} home`}
        >
          <BrandMark
            name={APP_NAME}
            icon={
              <Zap size={Math.round(34 * 0.46)} strokeWidth={2} style={{ color: colors.accent }} />
            }
          />
        </Link>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className={`flex size-10 cursor-pointer items-center justify-center rounded-xl transition ${FOCUS}`}
          style={{ color: colors.inkSecondary }}
        >
          <X size={21} strokeWidth={2} aria-hidden />
        </button>
      </div>

      <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto overscroll-contain px-4 pt-2 pb-8 sm:px-6">
        <div className="mx-auto w-full max-w-lg">
          {searchField}

          {NAV_GROUPS.map((group) => (
            <section key={group.id} className="mt-6">
              <NavSectionLabel>{group.label}</NavSectionLabel>
              <NavPanel>
                {group.children.map((child) => (
                  <NavRow key={child.label} {...toRowProps(child)} />
                ))}
              </NavPanel>
            </section>
          ))}

          <section className="mt-6">
            <NavSectionLabel>Explore</NavSectionLabel>
            <NavPanel>
              {NAV_LINKS.map((link) => (
                <NavRow key={link.label} href={link.href} label={link.label} chevron />
              ))}
            </NavPanel>
          </section>

          <section className="mt-6">
            <NavSectionLabel>Log activity</NavSectionLabel>
            <NavPanel>
              {CREATE_ACTIONS.map((action) => (
                <NavRow key={action.label} {...toRowProps(action)} />
              ))}
            </NavPanel>
          </section>

          <div className="mt-6">
            {user ? (
              <NavPanel>
                <div className="flex items-center gap-3 px-4 py-4">
                  <Avatar src={user.image} name={user.name} size={40} />
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-bold" style={{ color: colors.ink }}>
                      {user.name || "Athlete"}
                    </p>
                    <p className="mt-0.5 truncate text-[12px]" style={{ color: colors.inkMuted }}>
                      {user.email}
                    </p>
                  </div>
                </div>

                <NavDivider />

                <NavRow
                  href="/dashboard"
                  icon={<User size={17} strokeWidth={2} aria-hidden />}
                  label="My profile"
                  chevron
                />
                <NavRow
                  href="/onboarding"
                  icon={<Settings size={17} strokeWidth={2} aria-hidden />}
                  label="Settings & preferences"
                  chevron
                />

                <NavDivider />

                <NavRow
                  onClick={onSignOut}
                  icon={<LogOut size={17} strokeWidth={2} aria-hidden />}
                  label="Sign out"
                  tone="danger"
                />
              </NavPanel>
            ) : (
              <Link
                href="/auth"
                className={`flex h-14 w-full items-center justify-center rounded-2xl text-[15px] font-semibold transition active:opacity-80 ${FOCUS}`}
                style={{ backgroundColor: colors.accent, color: colors.onAccent }}
              >
                Sign in or create an account
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Maps a nav destination onto the row primitive's props. */
function toRowProps(child: NavChild) {
  const Icon = child.icon

  return {
    href: child.href,
    label: child.label,
    detail: child.detail,
    chevron: true,
    icon: <Icon size={17} strokeWidth={2} aria-hidden />,
  }
}