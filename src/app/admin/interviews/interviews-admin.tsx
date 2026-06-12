"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";

import { toast } from "sonner";
import { Mic, Plus, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { compressImageFile } from "@/lib/image-compress";

import { createInterview, deleteInterview, updateInterview } from "./_actions";

function createInterviewSchema(isEdit: boolean) {
  return z
    .object({
      title: z.string().min(1, "Title is required."),
      person: z.string().min(1, "Program or outlet is required."),
      role: z.string().optional(),
      location_meta: z.string().optional(),
      content: z.string().optional(),
      media_type: z.enum(["audio", "video"]),
      sort_order: z.string().optional(),
      image: z.any().optional(),
      media: z.any().optional(),
    })
    .superRefine((values, ctx) => {
      if (isEdit) return;

      const mediaFile = values.media as FileList | undefined;
      if (!mediaFile?.[0]) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Upload an audio or video file.",
          path: ["media"],
        });
      }
    });
}

export type InterviewRow = {
  id: string;
  title: string | null;
  person: string | null;
  role: string | null;
  content: string | null;
  image_url: string | null;
  media_type: "audio" | "video" | null;
  media_url: string | null;
  location_meta: string | null;
  sort_order: number | null;
};

type InterviewFormValues = z.infer<ReturnType<typeof createInterviewSchema>>;

function InterviewForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<InterviewRow>;
  onCancel: () => void;
  onSubmit: (values: InterviewFormValues, files?: { image?: File; media?: File }) => Promise<void>;
}) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);

  const form = useForm<InterviewFormValues>({
    resolver: zodResolver(createInterviewSchema(isEdit)),
    defaultValues: {
      title: initial?.title ?? "",
      person: initial?.person ?? "",
      role: initial?.role ?? "",
      location_meta: initial?.location_meta ?? "",
      content: initial?.content ?? "",
      media_type: initial?.media_type ?? "audio",
      sort_order: String(initial?.sort_order ?? 0),
      image: undefined,
      media: undefined,
    },
    mode: "onChange",
  });

  const [pending, startTransition] = useTransition();
  const mediaType = form.watch("media_type");
  const watchedImage = form.watch("image") as FileList | undefined;
  const watchedMedia = form.watch("media") as FileList | undefined;

  async function handleSubmit(values: InterviewFormValues) {
    const imageFile = watchedImage?.[0];
    const mediaFile = watchedMedia?.[0];
    startTransition(async () => {
      const compressed = imageFile ? await compressImageFile(imageFile) : undefined;
      await onSubmit(values, { image: compressed, media: mediaFile });
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1"
    >
      <div className="space-y-2">
        <Label htmlFor="media_type">Media type</Label>
        <Controller
          control={form.control}
          name="media_type"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="media_type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="audio">Audio</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Interview title</Label>
        <Input
          id="title"
          placeholder="e.g. The Man Who Swam to the East"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="person">Program or outlet</Label>
        <Input
          id="person"
          placeholder="e.g. Democracy Now!"
          {...form.register("person")}
        />
        {form.formState.errors.person ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.person.message}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="role">Year (optional)</Label>
          <Input id="role" placeholder="e.g. 1979" {...form.register("role")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order">Display order</Label>
          <Input
            id="sort_order"
            type="number"
            min={0}
            {...form.register("sort_order")}
          />
        </div>
      </div>

      {mediaType === "video" ? (
        <div className="space-y-2">
          <Label htmlFor="location_meta">Location and date (optional)</Label>
          <Input
            id="location_meta"
            placeholder="e.g. Treptower Park — May 8, 2025"
            {...form.register("location_meta")}
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="content">Description (optional)</Label>
        <Textarea
          id="content"
          rows={4}
          placeholder="Short description shown on the site..."
          {...form.register("content")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="media">Choose file</Label>
        <Input
          id="media"
          type="file"
          accept={mediaType === "video" ? "video/*" : "audio/*"}
          {...form.register("media")}
        />
        {form.formState.errors.media ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.media.message as string}
          </p>
        ) : null}
        {isEdit && initial?.media_url ? (
          <p className="text-xs text-muted-foreground">
            Leave empty to keep the current file.
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="image">
          {mediaType === "video" ? "Poster image (optional)" : "Thumbnail (optional)"}
        </Label>
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
  );
}

function appendInterviewFormData(
  formData: FormData,
  values: InterviewFormValues,
  files?: { image?: File; media?: File },
) {
  formData.append("title", values.title);
  formData.append("person", values.person);
  formData.append("role", values.role ?? "");
  formData.append("location_meta", values.location_meta ?? "");
  formData.append("content", values.content ?? "");
  formData.append("media_type", values.media_type);
  formData.append("sort_order", values.sort_order?.trim() || "0");
  if (files?.image) formData.append("image", files.image);
  if (files?.media) formData.append("media", files.media);
}

export function InterviewsAdmin({
  interviews,
}: {
  interviews: InterviewRow[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<InterviewRow | null>(null);
  const [interviewPendingDelete, setInterviewPendingDelete] =
    React.useState<InterviewRow | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Interviews</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage audio interviews and video portraits for the public site.
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Interview
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Interview</DialogTitle>
              <DialogDescription>
                Add a title, program, and media file.
              </DialogDescription>
            </DialogHeader>

            <InterviewForm
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values, files) => {
                const formData = new FormData();
                appendInterviewFormData(formData, values, files);

                const res = await createInterview(formData);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Interview created.");
                setCreateOpen(false);
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
            add audio or video content.
          </div>
        ) : (
          <div className="grid items-stretch gap-6 p-3 sm:p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {interviews.map((interview) => (
              <Card
                key={interview.id}
                className="border-border/60 bg-card/40 flex h-full flex-col gap-0! overflow-hidden p-0! py-0! shadow-sm ring-1 ring-border/50 transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-4/5 w-full shrink-0 bg-muted/25">
                  {interview.image_url ? (
                    <img
                      src={interview.image_url}
                      alt={interview.title ?? "Interview thumbnail"}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full min-h-[140px] flex-col items-center justify-center gap-2 px-3 text-center text-[11px] text-muted-foreground">
                      {interview.media_type === "video" ? (
                        <Video className="size-8 opacity-40" />
                      ) : (
                        <Mic className="size-8 opacity-40" />
                      )}
                      No image
                    </div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                    {interview.media_type === "video" ? "Video" : "Audio"}
                  </span>
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-3 pt-2.5 pb-0">
                  <h3 className="text-sm font-semibold leading-tight tracking-tight line-clamp-2">
                    {interview.title}
                  </h3>
                  <p className="mt-1 text-[11px] leading-tight text-muted-foreground line-clamp-1">
                    {interview.person ?? "—"}
                    {interview.role ? ` • ${interview.role}` : ""}
                  </p>
                  {interview.location_meta ? (
                    <p className="mt-1 text-[10px] leading-tight text-muted-foreground line-clamp-1">
                      {interview.location_meta}
                    </p>
                  ) : null}
                  <p className="mt-1.5 min-h-11 text-xs leading-snug text-muted-foreground line-clamp-3">
                    {(interview.content ?? "").trim() || "—"}
                  </p>
                </div>

                <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border/50 bg-muted/20 px-2 py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-xs font-medium"
                    onClick={() => {
                      setEditing(interview);
                      setEditOpen(true);
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Interview</DialogTitle>
            <DialogDescription>
              Update the title, program, or media file.
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <InterviewForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, files) => {
                const formData = new FormData();
                appendInterviewFormData(formData, values, files);

                const res = await updateInterview(editing.id, formData);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Interview updated.");
                setEditOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!interviewPendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setInterviewPendingDelete(null);
            setDeletePending(false);
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
                if (!interviewPendingDelete) return;
                setDeletePending(true);
                const res = await deleteInterview(interviewPendingDelete.id);
                setDeletePending(false);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Interview deleted.");
                setInterviewPendingDelete(null);
                router.refresh();
              }}
            >
              {deletePending ? "Deleting..." : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
