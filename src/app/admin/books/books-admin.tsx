"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
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

import { createBook, deleteBook, updateBook } from "./_actions"

const bookSchema = z.object({
  title: z.string().min(1, "Title is required."),
  author: z.string().min(1, "Author is required."),
  description: z.string().optional(),
  image: z.any().optional(),
})

type BookRow = {
  id: string
  title: string | null
  author: string | null
  description: string | null
  image_url: string | null
}

type BookFormValues = z.infer<typeof bookSchema>

function BookForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<BookRow>
  onCancel: () => void
  onSubmit: (values: BookFormValues, file?: File) => Promise<void>
}) {
  const router = useRouter()
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: initial?.title ?? "",
      author: initial?.author ?? "",
      description: initial?.description ?? "",
      image: undefined,
    },
    mode: "onChange",
  })

  const [pending, startTransition] = useTransition()
  const watchedImage = form.watch("image") as FileList | undefined

  async function handleSubmit(values: BookFormValues) {
    const file = watchedImage?.[0]
    startTransition(async () => {
      const compressed = file ? await compressImageFile(file) : undefined
      await onSubmit(values, compressed)
      router.refresh()
    })
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="space-y-2">
        <Label htmlFor="title">Book title</Label>
        <Input id="title" placeholder="e.g. Unterwegs zu Angela" {...form.register("title")} />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">Author</Label>
        <Input id="author" placeholder="e.g. Walter Kaufmann" {...form.register("author")} />
        {form.formState.errors.author ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.author.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          rows={4}
          placeholder="A short description shown to visitors..."
          {...form.register("description")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Cover image (optional)</Label>
        <Input
          id="image"
          type="file"
          accept="image/*"
          {...form.register("image")}
        />
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

export function BooksAdmin({ books }: { books: BookRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<BookRow | null>(null)

  const columns: DataTableColumn<BookRow>[] = [
    {
      key: "title",
      header: "Book",
      sortable: true,
      sortValue: (r) => r.title ?? "",
      render: (row) => (
        <div>
          <div className="font-medium">{row.title}</div>
          <div className="text-xs text-muted-foreground">{row.author}</div>
        </div>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (row) => (
        <span className="max-w-xs text-muted-foreground">
          {(row.description ?? "").slice(0, 80)}
          {(row.description ?? "").length > 80 ? "..." : ""}
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
            alt={row.title ?? "book"}
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
              const res = await deleteBook(row.id)
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success("Book deleted.")
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
          <h1 className="text-2xl font-semibold">Books</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Book
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Book</DialogTitle>
              <DialogDescription>Add details and an optional cover image.</DialogDescription>
            </DialogHeader>

            <BookForm
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                formData.append("author", values.author)
                formData.append("description", values.description ?? "")
                if (file) formData.append("image", file)

                const res = await createBook(formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Book created.")
                setCreateOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-transparent ring-0">
        <CardContent>
          {books.length === 0 ? (
            <div className="rounded-lg bg-transparent p-8 text-center text-sm text-muted-foreground">
              No books yet. Click <span className="font-medium text-foreground">New Book</span> to add the first one.
            </div>
          ) : (
            <DataTable data={books} columns={columns} />
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>Update fields and optionally replace the cover image.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <BookForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                formData.append("author", values.author)
                formData.append("description", values.description ?? "")
                if (file) formData.append("image", file)

                const res = await updateBook(editing.id, formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Book updated.")
                setEditOpen(false)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

