"use client"

import * as React from "react"
import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { z } from "zod"

import { toast } from "sonner"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  const [interviewPendingDelete, setInterviewPendingDelete] =
    React.useState<InterviewRow | null>(null)
  const [deletePending, setDeletePending] = React.useState(false)

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Interviews</h1>
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

      <div className="w-full overflow-hidden rounded-xl border border-border/50 bg-card/30">
      {interviews.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          No interviews yet. Click{" "}
          <span className="font-medium text-foreground">New Interview</span> to
          add one — they’ll show as <span className="font-medium text-foreground">cards</span> in a grid.
        </div>
      ) : (
        <div className="grid items-stretch gap-6 p-3 sm:p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {interviews.map((interview) => (
            <Card
              key={interview.id}
              className="border-border/60 bg-card/40 flex h-full flex-col gap-0! overflow-hidden p-0! py-0! shadow-sm ring-1 ring-border/50 transition-shadow hover:shadow-md"
            >
              {/* Cover */}
              <div className="relative aspect-4/5 w-full shrink-0 bg-muted/25">
                {interview.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- external CMS URLs (ImageKit, etc.)
                  <img
                    src={interview.image_url}
                    alt={interview.title ?? "Interview thumbnail"}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center px-3 text-center text-[11px] text-muted-foreground">
                    No image
                  </div>
                )}
              </div>

              {/* Text */}
              <div className="flex min-h-0 flex-1 flex-col px-3 pt-2.5 pb-0">
                <h3 className="text-sm font-semibold leading-tight tracking-tight line-clamp-2">
                  {interview.title}
                </h3>
                <p className="mt-1 text-[11px] leading-tight text-muted-foreground line-clamp-1">
                  {interview.person ?? "—"}
                  {interview.role ? ` • ${interview.role}` : ""}
                </p>
                <p className="mt-1.5 min-h-11 text-xs leading-snug text-muted-foreground line-clamp-3">
                  {(interview.content ?? "").trim() || "—"}
                </p>
              </div>

              {/* Actions: Edit left, Delete right */}
              <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border/50 bg-muted/20 px-2 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs font-medium"
                  onClick={() => {
                    setEditing(interview)
                    setEditOpen(true)
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs font-medium text-destructive hover:text-destructive"
                  onClick={() => setInterviewPendingDelete(interview)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      </div>

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

      {/* Delete confirm */}
      <AlertDialog
        open={!!interviewPendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setInterviewPendingDelete(null)
            setDeletePending(false)
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this interview?</AlertDialogTitle>
            <AlertDialogDescription>
              {interviewPendingDelete ? (
                <>
                  This will permanently remove{" "}
                  <span className="font-medium text-foreground">
                    {interviewPendingDelete.title ?? "this interview"}
                  </span>{" "}
                  from your library. This action cannot be undone.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletePending}>
              Cancel
            </AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              disabled={deletePending}
              onClick={async () => {
                if (!interviewPendingDelete) return
                setDeletePending(true)
                const res = await deleteInterview(interviewPendingDelete.id)
                setDeletePending(false)
                if (!res.ok) {
                  toast.error(res.message)
                  return
                }
                toast.success("Interview deleted.")
                setInterviewPendingDelete(null)
                router.refresh()
              }}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

