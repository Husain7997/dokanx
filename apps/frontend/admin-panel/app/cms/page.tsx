"use client";

import { Card, CardDescription, CardTitle } from "@dokanx/ui";

export default function CmsPage() {
  return (
    <div className="grid gap-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Admin</p>
        <h1 className="dx-display text-3xl">CMS</h1>
        <p className="text-sm text-muted-foreground">Homepage banners, landing pages, and announcements.</p>
      </div>
      <Card>
        <CardTitle>Homepage banners</CardTitle>
        <CardDescription className="mt-2">
          Publish seasonal banners, hero promotions, and marketplace announcements.
        </CardDescription>
      </Card>
      <Card>
        <CardTitle>Content library</CardTitle>
        <CardDescription className="mt-2">
          Manage FAQ, blog posts, and platform updates from one place.
        </CardDescription>
      </Card>
    </div>
  );
}
