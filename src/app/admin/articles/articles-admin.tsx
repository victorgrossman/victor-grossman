"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { z } from "zod"

import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DataTable, type DataTableColumn } from "@/components/data-table"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { compressImageFile } from "@/lib/image-compress"

import { createArticle, deleteArticle, updateArticle } from "./_actions"

const articleSchema = z.object({
  title: z.string().min(1, "Title is required."),
  excerpt: z.string().optional(),
  content: z.string().min(1, "Content is required."),
  image: z.any().optional(),
})

type ArticleRow = {
  id: string
  title: string | null
  excerpt: string | null
  content: string | null
  image_url: string | null
}

type ArticleFormValues = z.infer<typeof articleSchema>

function ArticleForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<ArticleRow>
  onCancel: () => void
  onSubmit: (values: ArticleFormValues, file?: File) => Promise<void>
}) {
  const router = useRouter()
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initial?.title ?? "",
      excerpt: initial?.excerpt ?? "",
      content: initial?.content ?? "",
      image: undefined,
    },
    mode: "onChange",
  })

  const [pending, startTransition] = useTransition()
  const watchedImage = form.watch("image") as FileList | undefined

  async function handleSubmit(values: ArticleFormValues) {
    const file = watchedImage?.[0]
    startTransition(async () => {
      const compressed = file ? await compressImageFile(file) : undefined
      await onSubmit(values, compressed)
      router.refresh()
    })
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="title">Article title</Label>
        <Input id="title" placeholder="e.g. Selected Articles" {...form.register("title")} />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="excerpt">Excerpt</Label>
        <Textarea id="excerpt" rows={3} placeholder="Short excerpt shown to visitors..." {...form.register("excerpt")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" rows={8} placeholder="Full article content..." {...form.register("content")} />
        {form.formState.errors.content ? (
          <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Cover image (optional)</Label>
        <Input id="image" type="file" accept="image/*" {...form.register("image")} />
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  )
}

export function ArticlesAdmin({ articles }: { articles: ArticleRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<ArticleRow | null>(null)

  const columns: DataTableColumn<ArticleRow>[] = [
    {
      key: "title",
      header: "Article",
      sortable: true,
      sortValue: (r) => r.title ?? "",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "excerpt",
      header: "Excerpt",
      render: (row) => (
        <span className="max-w-xs text-muted-foreground">
          {(row.excerpt ?? "").slice(0, 80)}
          {(row.excerpt ?? "").length > 80 ? "..." : ""}
        </span>
      ),
    },
    {
      key: "image",
      header: "Image",
      render: (row) =>
        row.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.image_url}
            alt={row.title ?? "article"}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <Badge variant="secondary">No image</Badge>
        ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditing(row)
              setEditOpen(true)
            }}
          >
            <Pencil className="mr-2 size-4" />
            Edit
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={async () => {
              const res = await deleteArticle(row.id)
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success("Article deleted.")
              router.refresh()
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Articles</h1>
          <p className="text-sm text-muted-foreground">
            Create and maintain editorial content.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Article
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Article</DialogTitle>
              <DialogDescription>Add title, excerpt and content.</DialogDescription>
            </DialogHeader>

            <ArticleForm
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                formData.append("excerpt", values.excerpt ?? "")
                formData.append("content", values.content)
                if (file) formData.append("image", file)

                const res = await createArticle(formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Article created.")
                setCreateOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All articles</CardTitle>
        </CardHeader>
        <CardContent>
          {articles.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
              No articles yet. Add one with <span className="font-medium text-foreground">New Article</span>.
            </div>
          ) : (
            <DataTable data={articles} columns={columns} />
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Article</DialogTitle>
            <DialogDescription>Update fields and optionally replace the image.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <ArticleForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                formData.append("excerpt", values.excerpt ?? "")
                formData.append("content", values.content)
                if (file) formData.append("image", file)

                const res = await updateArticle(editing.id, formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Article updated.")
                setEditOpen(false)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

