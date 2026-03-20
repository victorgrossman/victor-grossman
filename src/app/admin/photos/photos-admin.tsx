"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { z } from "zod"

import { toast } from "sonner"
import { Plus, Trash2, Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable, type DataTableColumn } from "@/components/data-table"
import { Form } from "@/components/ui/form"
import { compressImageFile } from "@/lib/image-compress"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { createPhoto, deletePhoto, updatePhoto } from "./_actions"

const photoSchema = z.object({
  title: z.string().min(1, "Title is required."),
  image: z.any().optional(),
})

type PhotoRow = {
  id: string
  title: string | null
  image_url: string | null
}

type PhotoFormValues = z.infer<typeof photoSchema>

function PhotoForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<PhotoRow>
  onCancel: () => void
  onSubmit: (values: PhotoFormValues, file?: File) => Promise<void>
}) {
  const form = useForm<PhotoFormValues>({
    resolver: zodResolver(photoSchema),
    defaultValues: { title: initial?.title ?? "", image: undefined },
    mode: "onChange",
  })

  const [pending, startTransition] = useTransition()
  const router = useRouter()
  const watchedImage = form.watch("image") as FileList | undefined

  async function handleSubmit(values: PhotoFormValues) {
    const file = watchedImage?.[0]
    startTransition(async () => {
      const compressed = file ? await compressImageFile(file) : undefined
      await onSubmit(values, compressed)
      router.refresh()
    })
  }

  return (
    <Form form={form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
      <div className="space-y-2">
        <Label htmlFor="title">Caption</Label>
        <Input
          id="title"
          placeholder="e.g. Victor Grossman at the Danube (1952)"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Image (optional)</Label>
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
    </Form>
  )
}

export function PhotosAdmin({ photos }: { photos: PhotoRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<PhotoRow | null>(null)

  const columns: DataTableColumn<PhotoRow>[] = [
    {
      key: "title",
      header: "Caption",
      sortable: true,
      sortValue: (r) => r.title ?? "",
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "image",
      header: "Image",
      render: (row) =>
        row.image_url ? (
          // Using Next Image only for display; uploads are handled by server actions.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.image_url}
            alt={row.title ?? "photo"}
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
              const res = await deletePhoto(row.id)
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success("Photo deleted.")
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
          <h1 className="text-2xl font-semibold">Photos</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Photo
          </Button>
          <DialogContent>
      <DialogHeader>
              <DialogTitle>Create Photo</DialogTitle>
              <DialogDescription>
                Add a caption and optionally upload an image.
              </DialogDescription>
            </DialogHeader>

            <PhotoForm
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                if (file) formData.append("image", file)

                const res = await createPhoto(formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Photo created.")
                setCreateOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-transparent ring-0">
        <CardContent>
          {photos.length === 0 ? (
            <div className="rounded-lg bg-transparent p-8 text-center text-sm text-muted-foreground">
              No photos yet. Click{" "}
              <span className="font-medium text-foreground">New Photo</span>{" "}
              to add the first one.
            </div>
          ) : (
            <DataTable data={photos} columns={columns} />
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Photo</DialogTitle>
            <DialogDescription>
              Update the caption or replace the image.
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <PhotoForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("title", values.title)
                if (file) formData.append("image", file)

                const res = await updatePhoto(editing.id, formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Photo updated.")
                setEditOpen(false)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

