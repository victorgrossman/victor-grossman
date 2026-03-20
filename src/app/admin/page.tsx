import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  BookOpen,
  Image as ImageIcon,
  MessageSquareText,
  Mic,
  Newspaper,
} from "lucide-react"

function sparkBars(value: number, max: number) {
  const safeMax = Math.max(max, 1)
  const base = value / safeMax

  return Array.from({ length: 12 }, (_, i) => {
    const t = i / 11
    const wobble = ((i * 17 + value * 3) % 13) / 13
    const h = 8 + Math.round((base * (0.35 + t) + wobble * 0.2) * 28)
    return Math.min(38, Math.max(8, h))
  })
}

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
  const [photos, tributes, books, articles, interviews] = await Promise.all([
    getCount("photos"),
    getCount("tributes"),
    getCount("books"),
    getCount("articles"),
    getCount("interviews"),
  ])

  const total = photos + tributes + books + articles + interviews

  const maxCount = Math.max(photos, tributes, books, articles, interviews, 1)

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
            icon: ImageIcon,
          },
          {
            label: "Tributes",
            value: tributes,
            href: "/admin/tributes",
            icon: MessageSquareText,
          },
          {
            label: "Books",
            value: books,
            href: "/admin/books",
            icon: BookOpen,
          },
          {
            label: "Articles",
            value: articles,
            href: "/admin/articles",
            icon: Newspaper,
          },
          {
            label: "Interviews",
            value: interviews,
            href: "/admin/interviews",
            icon: Mic,
          },
        ].map((s) => {
          const Icon = s.icon
          const bars = sparkBars(s.value, maxCount)
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

