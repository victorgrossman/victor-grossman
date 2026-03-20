"use client"

import * as React from "react"
import { useTransition } from "react"
import { z } from "zod"
import { useRouter } from "next/navigation"

import { toast } from "sonner"
import { Plus, Pencil, Trash2, ThumbsUp, ThumbsDown } from "lucide-react"

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

import {
  approveTribute,
  createTribute,
  deleteTribute,
  rejectTribute,
  updateTribute,
} from "./_actions"

const tributeSchema = z.object({
  name: z.string().min(1, "Name is required."),
  message: z.string().min(1, "Message is required."),
  image: z.any().optional(),
})

type TributeRow = {
  id: string
  name: string | null
  message: string | null
  image_url: string | null
  status: "pending" | "approved" | "rejected" | string | null
}

type TributeFormValues = z.infer<typeof tributeSchema>

function statusBadge(status: TributeRow["status"]) {
  if (status === "approved") return <Badge>Approved</Badge>
  if (status === "rejected") return <Badge variant="destructive">Rejected</Badge>
  return <Badge variant="secondary">Pending</Badge>
}

function TributeForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<TributeRow>
  onCancel: () => void
  onSubmit: (values: TributeFormValues, file?: File) => Promise<void>
}) {
  const router = useRouter()
  const form = useForm<TributeFormValues>({
    resolver: zodResolver(tributeSchema),
    defaultValues: {
      name: initial?.name ?? "",
      message: initial?.message ?? "",
      image: undefined,
    },
    mode: "onChange",
  })

  const [pending, startTransition] = useTransition()
  const watchedImage = form.watch("image") as FileList | undefined

  async function handleSubmit(values: TributeFormValues) {
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
        <Label htmlFor="name">Your name</Label>
        <Input id="name" placeholder="e.g. Sevim Dagdelen" {...form.register("name")} />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">Tribute message</Label>
        <Textarea
          id="message"
          rows={6}
          placeholder="Write what you want to share..."
          {...form.register("message")}
        />
        {form.formState.errors.message ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.message.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">Photo (optional)</Label>
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

export function TributesAdmin({ tributes }: { tributes: TributeRow[] }) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editOpen, setEditOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<TributeRow | null>(null)

  const columns: DataTableColumn<TributeRow>[] = [
    {
      key: "name",
      header: "Author",
      sortable: true,
      sortValue: (r) => r.name ?? "",
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      sortable: false,
      render: (row) => <div className="flex items-center gap-2">{statusBadge(row.status)}</div>,
    },
    {
      key: "message",
      header: "Message",
      render: (row) => (
        <span className="max-w-xs text-muted-foreground">
          {(row.message ?? "").slice(0, 80)}
          {(row.message ?? "").length > 80 ? "..." : ""}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-2">
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
              const res = await deleteTribute(row.id)
              if (!res.ok) {
                toast.error(res.message)
                return
              }
              toast.success("Tribute deleted.")
              router.refresh()
            }}
          >
            <Trash2 className="mr-2 size-4" />
            Delete
          </Button>

          {row.status === "pending" ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const res = await approveTribute(row.id)
                  if (!res.ok) {
                    toast.error(res.message)
                    return
                  }
                  toast.success("Tribute approved.")
                  router.refresh()
                }}
              >
                <ThumbsUp className="mr-2 size-4" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const res = await rejectTribute(row.id)
                  if (!res.ok) {
                    toast.error(res.message)
                    return
                  }
                  toast.success("Tribute rejected.")
                  router.refresh()
                }}
              >
                <ThumbsDown className="mr-2 size-4" />
                Reject
              </Button>
            </>
          ) : null}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tributes</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Tribute
          </Button>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Tribute</DialogTitle>
              <DialogDescription>
                Submit a tribute and set it to pending.
              </DialogDescription>
            </DialogHeader>

            <TributeForm
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("name", values.name)
                formData.append("message", values.message)
                if (file) formData.append("image", file)

                const res = await createTribute(formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Tribute created.")
                setCreateOpen(false)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-transparent ring-0">
        <CardContent>
          {tributes.length === 0 ? (
            <div className="rounded-lg bg-transparent p-8 text-center text-sm text-muted-foreground">
              No tributes yet. When someone submits via the public site, they will appear here for approval.
            </div>
          ) : (
            <DataTable data={tributes} columns={columns} />
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tribute</DialogTitle>
            <DialogDescription>Update details (approval status is manual).</DialogDescription>
          </DialogHeader>

          {editing ? (
            <TributeForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData()
                formData.append("name", values.name)
                formData.append("message", values.message)
                if (file) formData.append("image", file)

                const res = await updateTribute(editing.id, formData)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Tribute updated.")
                setEditOpen(false)
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

