import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

async function getCount(table: string) {
  try {
    const supabase = createSupabaseServerClient()
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
    if (error) return 0
    return count ?? 0
  } catch {
    return 0
  }
}

export default async function AdminDashboard() {
  const [photos, tributes, books, articles, interviews, bulletins] = await Promise.all([
    getCount("photos"),
    getCount("tributes"),
    getCount("books"),
    getCount("articles"),
    getCount("interviews"),
    getCount("bulletins"),
  ])

  const total = photos + tributes + books + articles + interviews + bulletins

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Manage memorial content in one place.
          </p>
        </div>
        <Badge variant="secondary" className="w-fit">
          Total items: {total}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Photos",
            value: photos,
            href: "/admin/photos",
          },
          {
            label: "Tributes",
            value: tributes,
            href: "/admin/tributes",
          },
          {
            label: "Books",
            value: books,
            href: "/admin/books",
          },
          {
            label: "Articles",
            value: articles,
            href: "/admin/articles",
          },
          {
            label: "Interviews",
            value: interviews,
            href: "/admin/interviews",
          },
          {
            label: "Bulletins",
            value: bulletins,
            href: "/admin/bulletins",
          },
        ].map((s) => {
          return (
            <Card
              key={s.href}
              className="border-border/60 bg-background/30"
            >
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-base">{s.label}</CardTitle>
                  <span className="text-sm text-muted-foreground">{s.value}</span>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <Button asChild className="w-full" variant="secondary">
                  <Link href={s.href}>Manage {s.label}</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}

        {/* small spacer to keep grid like screenshot */}
        <div className="hidden md:block" />
      </div>
    </div>
  )
}

