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
  const [photos, tributes, books, articles, interviews] = await Promise.all([
    getCount("photos"),
    getCount("tributes"),
    getCount("books"),
    getCount("articles"),
    getCount("interviews"),
  ])

  const total = photos + tributes + books + articles + interviews

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
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Photos</CardTitle>
            <Badge>{photos}</Badge>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/admin/photos">Manage Photos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Tributes</CardTitle>
            <Badge>{tributes}</Badge>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/admin/tributes">Manage Tributes</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Books</CardTitle>
            <Badge>{books}</Badge>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/admin/books">Manage Books</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Articles</CardTitle>
            <Badge>{articles}</Badge>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/admin/articles">Manage Articles</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Interviews</CardTitle>
            <Badge>{interviews}</Badge>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full" variant="secondary">
              <Link href="/admin/interviews">Manage Interviews</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

