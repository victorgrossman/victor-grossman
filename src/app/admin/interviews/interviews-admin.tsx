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

import { createInterview, deleteInterview, updateInterview } from "./_actions"

const interviewSchema = z.object({
  title: z.string().min(1, "Title is required."),
  person: z.string().min(1, "Person is required."),
  role: z.string().optional(),
  content: z.string().min(1, "Content is required."),
  image: z.any().optional(),
})

type InterviewRow = {
  id: string
  title: string | null
  person: string | null
  role: string | null
  content: string | null
  image_url: string | null
}

type InterviewFormValues = z.infer<typeof interviewSchema>

function InterviewForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<InterviewRow>
  onCancel: () => void
  onSubmit: (values: InterviewFormValues, file?: File) => Promise<void>
}) {
  const router = useRouter()
  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(interviewSchema),
    defaultValues: {
      title: initial?.title ?? "",
      person: initial?.person ?? "",
      role: initial?.role ?? "",
      content: initial?.content ?? "",
      image: undefined,
    },
    mode: "onChange",
  })

  const [pending, startTransition] = useTransition()
  const watchedImage = form.watch("image") as FileList | undefined

  async function handleSubmit(values: InterviewFormValues) {
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
        <Label htmlFor="title">Interview title</Label>
        <Input
          id="title"
          placeholder="e.g. The Man Who Swam to the East"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="person">Program / outlet</Label>
        <Input
          id="person"
          placeholder="e.g. Democracy Now!"
          {...form.register("person")}
        />
        {form.formState.errors.person ? (
          <p className="text-sm text-destructive">{form.formState.errors.person.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Year (optional)</Label>
        <Input id="role" placeholder="e.g. 1979" {...form.register("role")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Transcript / notes</Label>
        <Textarea
          id="content"
          rows={8}
          placeholder="Short notes or transcript shown on the site..."
          {...form.register("content")}
        />
        {form.formState.errors.content ? (
          <p className="text-sm text-destructive">{form.formState.errors.content.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Thumbnail image (optional)</Label>
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

export function InterviewsAdmin({ interviews }: { interviews: InterviewRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<InterviewRow | null>(null)

  const columns: DataTableColumn<InterviewRow>[] = [
    {
      key: "title",
      header: "Interview",
      sortable: true,
      sortValue: (r) => r.title ?? "",
      render: (row) => (
        <div>
          <div className="font-medium">{row.title}</div>
          <div className="text-xs text-muted-foreground">
            {row.person}
            {row.role ? ` • ${row.role}` : ""}
          </div>
        </div>
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
            alt={row.title ?? "interview"}
            className="h-10 w-10 rounded object-cover"
          />
        ) : (
          <Badge variant="secondary">No image</Badge>
        ),
    },
    {
      key: "content",
      header: "Notes",
      render: (row) => (
        <span className="max-w-xs text-muted-foreground">
          {(row.content ?? "").slice(0, 80)}
          {(row.content ?? "").length > 80 ? "..." : ""}
        </span>
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
              const res = await deleteInterview(row.id)
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success("Interview deleted.")
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
          <h1 className="text-2xl font-semibold">Interviews</h1>
          <p className="text-sm text-muted-foreground">
            Manage interview content for the memorial site.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Interview
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Interview</DialogTitle>
              <DialogDescription>
                Add program, interview title, and site notes.
              </DialogDescription>
            </DialogHeader>

            <InterviewForm
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                formData.append("person", values.person)
                formData.append("role", values.role ?? "")
                formData.append("content", values.content)
                if (file) formData.append("image", file)

                const res = await createInterview(formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Interview created.")
                setCreateOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All interviews</CardTitle>
        </CardHeader>
        <CardContent>
          {interviews.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/10 p-8 text-center text-sm text-muted-foreground">
              No interviews yet. Use <span className="font-medium text-foreground">New Interview</span> to add one.
            </div>
          ) : (
            <DataTable data={interviews} columns={columns} />
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Interview</DialogTitle>
            <DialogDescription>Update details and optionally replace the image.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <InterviewForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                formData.append("person", values.person)
                formData.append("role", values.role ?? "")
                formData.append("content", values.content)
                if (file) formData.append("image", file)

                const res = await updateInterview(editing.id, formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Interview updated.")
                setEditOpen(false)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

