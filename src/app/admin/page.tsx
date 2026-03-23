import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createSupabaseServerClient } from "@/lib/supabase/server"

const PREVIEW_LIMIT = 4

async function getPhotosPreview() {
  const supabase = createSupabaseServerClient()
  const { data, count } = await supabase
    .from("photos")
    .select("id, title, image_url", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT)
  return { rows: data ?? [], count: count ?? 0 }
}

async function getTributesPreview() {
  const supabase = createSupabaseServerClient()
  const { data, count } = await supabase
    .from("tributes")
    .select("id, name, message", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT)
  return { rows: data ?? [], count: count ?? 0 }
}

async function getBooksPreview() {
  const supabase = createSupabaseServerClient()
  const { data, count } = await supabase
    .from("books")
    .select("id, title, author, image_url", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT)
  return { rows: data ?? [], count: count ?? 0 }
}

async function getArticlesPreview() {
  const supabase = createSupabaseServerClient()
  const { data, count } = await supabase
    .from("articles")
    .select("id, title, excerpt", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT)
  return { rows: data ?? [], count: count ?? 0 }
}

async function getInterviewsPreview() {
  const supabase = createSupabaseServerClient()
  const { data, count } = await supabase
    .from("interviews")
    .select("id, title, person", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT)
  return { rows: data ?? [], count: count ?? 0 }
}

async function getBulletinsPreview() {
  const supabase = createSupabaseServerClient()
  const { data, count } = await supabase
    .from("bulletins")
    .select("id, title, bulletin_number", { count: "exact" })
    .order("created_at", { ascending: false })
    .limit(PREVIEW_LIMIT)
  return { rows: data ?? [], count: count ?? 0 }
}

export default async function AdminDashboard() {
  const [photos, tributes, books, articles, interviews, bulletins] =
    await Promise.all([
      getPhotosPreview(),
      getTributesPreview(),
      getBooksPreview(),
      getArticlesPreview(),
      getInterviewsPreview(),
      getBulletinsPreview(),
    ])

  const total =
    photos.count + tributes.count + books.count +
    articles.count + interviews.count + bulletins.count

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Photos */}
        <DashCard label="Photos" count={photos.count} href="/admin/photos">
          {photos.rows.length > 0 ? (
            <div className="flex gap-2 overflow-hidden">
              {photos.rows.map((p) => (
                <div key={p.id} className="size-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.title} className="size-full object-cover" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">No img</div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </DashCard>

        {/* Tributes */}
        <DashCard label="Tributes" count={tributes.count} href="/admin/tributes">
          {tributes.rows.length > 0 ? (
            <ul className="space-y-1">
              {tributes.rows.map((t) => (
                <li key={t.id} className="truncate text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t.name}</span>
                  {" — "}
                  {t.message}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </DashCard>

        {/* Books */}
        <DashCard label="Books" count={books.count} href="/admin/books">
          {books.rows.length > 0 ? (
            <div className="flex gap-2 overflow-hidden">
              {books.rows.map((b) => (
                <div key={b.id} className="flex w-20 shrink-0 flex-col gap-1">
                  <div className="h-16 w-full overflow-hidden rounded-md bg-muted">
                    {b.image_url ? (
                      <img src={b.image_url} alt={b.title} className="size-full object-cover" />
                    ) : (
                      <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">No img</div>
                    )}
                  </div>
                  <span className="truncate text-[10px] text-muted-foreground">{b.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </DashCard>

        {/* Articles */}
        <DashCard label="Articles" count={articles.count} href="/admin/articles">
          {articles.rows.length > 0 ? (
            <ul className="space-y-1">
              {articles.rows.map((a) => (
                <li key={a.id} className="truncate text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{a.title}</span>
                  {a.excerpt ? ` — ${a.excerpt}` : ""}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </DashCard>

        {/* Interviews */}
        <DashCard label="Interviews" count={interviews.count} href="/admin/interviews">
          {interviews.rows.length > 0 ? (
            <ul className="space-y-1">
              {interviews.rows.map((i) => (
                <li key={i.id} className="truncate text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{i.person}</span>
                  {" — "}
                  {i.title}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </DashCard>

        {/* Bulletins */}
        <DashCard label="Bulletins" count={bulletins.count} href="/admin/bulletins">
          {bulletins.rows.length > 0 ? (
            <ul className="space-y-1">
              {bulletins.rows.map((b) => (
                <li key={b.id} className="truncate text-xs text-muted-foreground">
                  {b.bulletin_number ? (
                    <span className="font-medium text-foreground">#{b.bulletin_number}</span>
                  ) : null}
                  {" "}
                  {b.title}
                </li>
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </DashCard>
      </div>
    </div>
  )
}

function DashCard({
  label,
  count,
  href,
  children,
}: {
  label: string
  count: number
  href: string
  children: React.ReactNode
}) {
  return (
    <Card className="border-border/60 bg-background/30">
      <CardHeader className="flex-row items-start justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-base">{label}</CardTitle>
          <span className="text-sm text-muted-foreground">{count}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="min-h-14">{children}</div>
        <Button asChild className="w-full" variant="secondary">
          <Link href={href}>Manage {label}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function Empty() {
  return <p className="text-xs text-muted-foreground">No items yet.</p>
}
