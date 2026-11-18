# Global Header Search & Cross-View Filtering

Adds a unified global search bar to the top navigation header that filters leads live across every workspace view and provides a keyboard-accessible quick-jump dropdown to open any lead dossier immediately.

### User Review & Critical Decisions

> [!IMPORTANT]
> **Confirmed Search Behavior & Scope**
> All search interaction choices below were confirmed during clarification and govern this implementation.

- **Dual Filtering + Quick-Jump Dropdown**: Confirmed — typing in the header search bar filters the currently active view in real time while showing a dropdown of top matching leads for instant dossier inspection.
- **Unified Search Input**: Confirmed — the redundant search input inside the KYC Directory toolbar is removed so users only interact with one canonical search bar in the top header.
- **Keyboard Shortcut & Searchable Fields**: Confirmed — `Ctrl+K` / `Cmd+K` focuses the search input, `Escape` dismisses the dropdown, and matching covers **Company Name**, **GSTIN**, **Lead ID**, **Salesperson Name**, and **City**.

---

### 1. Overview & Core Concept

- **What It Does**: Places a sleek, persistent search input inside the top navigation bar that acts as a single source of truth for locating and filtering KYC & Lead records regardless of which section (`Overview`, `Review Queue`, `KYC Directory`, `Lead Pipeline`, or `Team Leaderboard`) is active.
- **Target Audience / Persona**: Salespersons and Managers switching between queues, pipeline columns, and team analytics who need instant lookup by company, 15-character GSTIN, lead ID (`KYC-2026-...`), salesperson, or city without navigating back to the directory each time.
- **Key Value**: Cuts navigation friction, eliminates duplicate search boxes, and gives users both immediate jump-to-record access and live cross-view filtering.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Shortcut or Click Focus**: Pressing `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux)—or clicking the header search field—focuses the input and shows recent/matching leads if a query is present.
  2. **Live Cross-View Filtering**: As the user types, a normalized query filters the dataset passed to the active workspace view:
     - *Overview*: KPI totals, workflow stage counts, and attention items dynamically reflect matching leads (with a subtle indicator showing the active search filter and a one-click `Clear` button).
     - *Review Queue / Needs Action*: Filters pending and revision-needed cards matching the query.
     - *KYC Directory*: Uses the global query directly alongside existing Entity Type (`All` / `Customer` / `Vendor`), Stage, and Salesperson dropdown filters.
     - *Lead Pipeline*: Filters pipeline cards across all six columns while preserving column totals for the matched subset.
     - *Team Leaderboard*: Filters leaderboard rows to show reps matching the search query or reps whose matching leads contribute to the filtered view.
  3. **Quick-Jump Dropdown**: While focused with a non-empty query, a flat single-elevation dropdown panel renders up to 6 top matches (showing Company Name, Lead ID, GSTIN, Salesperson, City, and Stage). Clicking a row or pressing `ArrowDown` / `ArrowUp` + `Enter` opens that lead's Dossier Drawer immediately and closes the dropdown.
  4. **Clear & Reset**: Clicking the inline `X` button inside the search bar (or pressing `Clear search` in the active filter notice) immediately restores the full unfiltered dataset across all views.

- **Visual Identity & Layout**:
  - *Top Header Integration*: Preserves the clean single-row top bar contract (`Breadcrumb left` — `Global Search center` — `New KYC Entry CTA right`) with `whitespace-nowrap shrink-0` controls and responsive width on mobile/tablet viewports.
  - *Typography & Surfaces*: Uses `DM Sans` for company names and `JetBrains Mono` (`tabular-nums`) for GSTINs, Lead IDs, and the `⌘K` / `Ctrl K` keycap hint. Dropdown surfaces follow the flat `#FFFFFF` + `1px` `#E2E8F0` hairline border system with subtle `slate-50` hover states and zero pill badge clutter.
  - *Motion & Latency*: Instant client-side filtering (`0ms` debounce needed on local dataset) and `<= 150ms` dropdown reveal/hover transitions.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Lift Search State to the Application Shell**
  - *Chosen Approach*: Store `globalSearchQuery` at the root application state level and derive a single filtered lead list (plus raw list where needed for counts) shared by all views.
  - *Why*: Guarantees consistent matching logic across all five views and keeps the KYC Directory filters seamlessly synchronized without duplicating filter state.
  - *Alternatives Considered*: Keeping separate local search states per view—rejected because it violates the cross-view filtering requirement and causes jarring resets when switching tabs.
- **Decision 2: Dual Mode (Live Filtering + Quick-Jump Popover)**
  - *Chosen Approach*: Filter the active view immediately while surfacing a compact top-6 quick-jump list on focus.
  - *Why*: Lets users either scan a full filtered table/pipeline OR jump straight into a specific company dossier in two keystrokes without changing their current screen.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Search Data Flow Architecture**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│             Top Header Global Search Input (Ctrl/Cmd + K)               │
│     Query: Company Name · GSTIN · Lead ID · Salesperson · City          │
└───────────┬─────────────────────────────────────────┬───────────────────┘
            │                                         │
            ▼ (Popover when focused & non-empty)      ▼ (Centralized match filter)
┌───────────────────────────┐             ┌───────────────────────────────┐
│  Quick-Jump Dropdown      │             │  Filtered Leads Selector      │
│  · Arrow Up/Down + Enter  │             │  · Shared across all 5 views  │
│  · Opens Lead Dossier     │             │  · Clear filter indicator     │
└───────────────────────────┘             └───────────────┬───────────────┘
                                                          │
          ┌───────────────┬───────────────┬───────────────┼───────────────┐
          ▼               ▼               ▼               ▼               ▼
     [Overview]     [Review Queue]  [KYC Directory] [Lead Pipeline] [Leaderboard]
```

- **Data Model & Matching Logic**:
  - A shared pure matching helper normalizes the query (`trim().toLowerCase()`) and matches against `companyName`, `gstin`, `id`, `salespersonName`, and `city`.
  - Existing entity, stage, and salesperson dropdown filters inside `KYC Directory` and `Lead Pipeline` compose cleanly on top of the globally filtered leads.
- **Interactive Component & State Mapping**:
  - *Header Search Component*: Manages focus state, outside-click dismissal, keyboard navigation (`Cmd/Ctrl+K`, `ArrowUp`, `ArrowDown`, `Enter`, `Escape`), and clear action.
  - *Active Filter Banner*: Displays a compact, dismissible status strip above the active view when `globalSearchQuery` is non-empty, showing the match count and a `Clear search` button so users always have clear context.
  - *View Props*: Each workspace view receives the globally filtered leads (and Leaderboard receives matched reps/leads) with complete populated and empty-search states.
