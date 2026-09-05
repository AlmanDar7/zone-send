/**
 * Intelligent background prefetcher for instant 0ms page navigation
 */

export const pagePrefetchMap: Record<string, () => Promise<any>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/contacts": () => import("@/pages/Contacts"),
  "/emails": () => import("@/pages/Emails"),
  "/forms": () => import("@/pages/Forms"),
  "/workflows": () => import("@/pages/Workflows"),
  "/campaigns": () => import("@/pages/Campaigns"),
  "/campaigns/new": () => import("@/pages/CampaignWizard"),
  "/analytics": () => import("@/pages/Analytics"),
  "/email-queue": () => import("@/pages/EmailQueue"),
  "/profile": () => import("@/pages/Profile"),
  "/settings": () => import("@/pages/SettingsPage"),
  "/emails/templates": () => import("@/pages/TemplateGallery"),
  "/forms/templates": () => import("@/pages/TemplateGallery"),
};

export const prefetchPage = (path: string) => {
  const loader = pagePrefetchMap[path];
  if (loader) {
    loader().catch(() => {});
  }
};

let prefetched = false;

export const prefetchCorePages = () => {
  if (prefetched || typeof window === "undefined") return;
  prefetched = true;

  const loaders = Object.values(pagePrefetchMap);

  const runNext = (index: number) => {
    if (index >= loaders.length) return;
    const idleCallback =
      (window as any).requestIdleCallback || ((cb: any) => setTimeout(cb, 150));

    idleCallback(() => {
      loaders[index]()
        .catch(() => {})
        .finally(() => {
          setTimeout(() => runNext(index + 1), 100);
        });
    });
  };

  // Trigger background idle loading 1s after initial load
  setTimeout(() => runNext(0), 1000);
};
