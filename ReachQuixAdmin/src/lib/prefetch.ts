/**
 * Intelligent background prefetcher for instant 0ms admin navigation
 */

export const adminPagePrefetchMap: Record<string, () => Promise<any>> = {
  "/": () => import("@/pages/Dashboard"),
  "/users": () => import("@/pages/Users"),
  "/contacts": () => import("@/pages/Contacts"),
  "/campaigns": () => import("@/pages/Campaigns"),
  "/queue": () => import("@/pages/Queue"),
  "/events": () => import("@/pages/Events"),
  "/templates": () => import("@/pages/Templates"),
  "/broadcast": () => import("@/pages/Broadcast"),
  "/audit-logs": () => import("@/pages/AuditLogs"),
  "/settings": () => import("@/pages/Settings"),
  "/system": () => import("@/pages/System"),
};

export const prefetchAdminPage = (path: string) => {
  const loader = adminPagePrefetchMap[path];
  if (loader) {
    loader().catch(() => {});
  }
};

let adminPrefetched = false;

export const prefetchCoreAdminPages = () => {
  if (adminPrefetched || typeof window === "undefined") return;
  adminPrefetched = true;

  const loaders = Object.values(adminPagePrefetchMap);

  const runNext = (index: number) => {
    if (index >= loaders.length) return;
    const idleCallback =
      (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 100));

    idleCallback(() => {
      loaders[index]()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => runNext(index + 1), 80);
        });
    });
  };

  setTimeout(() => runNext(0), 800);
};
