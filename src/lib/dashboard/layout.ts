export const dashboardWidgetIds = ["rating", "focus", "brief", "best", "stats", "activity", "updates", "loop"] as const;
export type DashboardWidgetId = typeof dashboardWidgetIds[number];
export type DashboardWidgetSize = "compact" | "standard" | "wide";
export type DashboardLayout = {
  version: 1;
  order: DashboardWidgetId[];
  hidden: DashboardWidgetId[];
  sizes: Record<DashboardWidgetId, DashboardWidgetSize>;
};

export const defaultDashboardLayout: DashboardLayout = {
  version: 1,
  order: [...dashboardWidgetIds],
  hidden: [],
  sizes: {
    rating: "compact",
    focus: "compact",
    brief: "wide",
    best: "compact",
    stats: "wide",
    activity: "standard",
    updates: "compact",
    loop: "wide",
  },
};

export const dashboardPresets: Record<"balanced" | "competitive" | "models" | "beginner", DashboardLayout> = {
  balanced: defaultDashboardLayout,
  competitive: { ...defaultDashboardLayout, order: ["rating", "brief", "stats", "best", "activity", "updates", "focus", "loop"], hidden: [], sizes: { ...defaultDashboardLayout.sizes, rating: "standard", stats: "standard" } },
  models: { ...defaultDashboardLayout, order: ["brief", "best", "rating", "stats", "activity", "focus", "updates", "loop"], hidden: ["loop"], sizes: { ...defaultDashboardLayout.sizes, best: "standard", rating: "standard" } },
  beginner: { ...defaultDashboardLayout, order: ["brief", "focus", "loop", "rating", "best", "stats", "activity", "updates"], hidden: ["updates"], sizes: { ...defaultDashboardLayout.sizes, focus: "standard", loop: "wide" } },
};

export function normalizeDashboardLayout(value: unknown): DashboardLayout {
  if (!value || typeof value !== "object") return structuredClone(defaultDashboardLayout);
  const candidate = value as Partial<DashboardLayout>;
  const validIds = new Set<string>(dashboardWidgetIds);
  const suppliedOrder = Array.isArray(candidate.order) ? candidate.order.filter((id): id is DashboardWidgetId => typeof id === "string" && validIds.has(id)) : [];
  const order = [...new Set(suppliedOrder), ...dashboardWidgetIds.filter((id) => !suppliedOrder.includes(id))];
  const hidden = Array.isArray(candidate.hidden) ? [...new Set(candidate.hidden.filter((id): id is DashboardWidgetId => typeof id === "string" && validIds.has(id)))] : [];
  const sizes = { ...defaultDashboardLayout.sizes };
  for (const id of dashboardWidgetIds) {
    const size = candidate.sizes?.[id];
    if (size === "compact" || size === "standard" || size === "wide") sizes[id] = size;
  }
  return { version: 1, order, hidden, sizes };
}
