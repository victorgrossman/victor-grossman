"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { z } from "zod";

import { toast } from "sonner";
import { Plus } from "lucide-react";

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
import { Form } from "@/components/ui/form";
import { compressImageFile } from "@/lib/image-compress";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  approvePhoto,
  createPhoto,
  deletePhoto,
  rejectPhoto,
  updatePhoto,
} from "./_actions";

const photoSchema = z.object({
  title: z.string(),
  image: z.any().optional(),
});

export type PhotoRow = {
  id: string;
  title: string | null;
  image_url: string | null;
  status: "pending" | "approved" | "rejected" | string | null;
  submitted_by?: string | null;
  approved_at?: string | null;
  rejected_at?: string | null;
};

type PhotoFormValues = z.infer<typeof photoSchema>;

function PhotoForm({
  initial,
  onCancel,
  onSubmit,
  variant = "edit",
}: {
  initial?: Partial<PhotoRow>;
  onCancel: () => void;
  onSubmit: (values: PhotoFormValues, file?: File) => Promise<void>;
  variant?: "create" | "edit";
}) {
  const form = useForm<PhotoFormValues>({
    resolver: zodResolver(photoSchema),
    defaultValues: { title: initial?.title ?? "", image: undefined },
    mode: "onChange",
  });

  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const watchedImage = form.watch("image") as FileList | undefined;

  const imageHint =
    variant === "create"
      ? "Choose an image file (required for new photos)."
      : "Leave empty to keep the current image.";

  async function handleSubmit(values: PhotoFormValues) {
    const file = watchedImage?.[0];
    startTransition(async () => {
      const compressed = file ? await compressImageFile(file) : undefined;
      await onSubmit(values, compressed);
      router.refresh();
    });
  }

  return (
    <Form form={form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="flex flex-col gap-4"
      >
        <div className="space-y-2">
          <Label htmlFor="title">Caption (optional)</Label>
          <Input
            id="title"
            placeholder="e.g. Victor at the Danube, 1952"
            {...form.register("title")}
          />
          {form.formState.errors.title ? (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="image">Image</Label>
          <Input
            id="image"
            type="file"
            accept="image/*"
            {...form.register("image")}
          />
          <p className="text-xs text-muted-foreground">{imageHint}</p>
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
  );
}

export function PhotosAdmin({ photos }: { photos: PhotoRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<PhotoRow | null>(null);
  const [activeView, setActiveView] = React.useState<"photos" | "requests">(
    "photos",
  );
  const [photoPendingDelete, setPhotoPendingDelete] =
    React.useState<PhotoRow | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

  const requestPhotos = React.useMemo(
    () => photos.filter((p) => (p.status ?? "approved") === "pending"),
    [photos],
  );
  const managedPhotos = React.useMemo(
    () => photos.filter((p) => (p.status ?? "approved") !== "pending"),
    [photos],
  );
  const visiblePhotos =
    activeView === "requests" ? requestPhotos : managedPhotos;

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Photos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gallery images for the memorial site (e.g.{" "}
            <span className="text-foreground/80">Fotografisches Archiv</span>).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={activeView === "photos" ? "default" : "outline"}
            onClick={() => setActiveView("photos")}
          >
            Photos
          </Button>
          <Button
            type="button"
            variant={activeView === "requests" ? "default" : "outline"}
            onClick={() => setActiveView("requests")}
          >
            Requests ({requestPhotos.length})
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              New Photo
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Photo</DialogTitle>
                <DialogDescription>
                  Upload an image (caption optional). Files go to ImageKit and
                  appear in your public gallery.
                </DialogDescription>
              </DialogHeader>

              <PhotoForm
                variant="create"
                onCancel={() => setCreateOpen(false)}
                onSubmit={async (values, file) => {
                  if (!file) {
                    toast.error("Please choose an image.");
                    return;
                  }
                  const formData = new FormData();
                  formData.append("title", values.title);
                  formData.append("image", file);

                  const res = await createPhoto(formData);
                  if (!res.ok) {
                    toast.error(res.message);
                    return;
                  }
                  toast.success("Photo created.");
                  setCreateOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-border/50 bg-card/30">
        {visiblePhotos.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {activeView === "requests" ? (
              <>No pending photo requests right now.</>
            ) : (
              <>
                No photos yet. Click{" "}
                <span className="font-medium text-foreground">New Photo</span>{" "}
                to add images for the memorial gallery.
              </>
            )}
          </div>
        ) : (
          <div className="grid items-stretch gap-6 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-3 xl:grid-cols-4">
            {visiblePhotos.map((photo) => (
              <Card
                key={photo.id}
                className="border-border/60 bg-card/40 flex h-full flex-col gap-0! overflow-hidden p-0! py-0! shadow-sm ring-1 ring-border/50 transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-square w-full shrink-0 bg-muted/25">
                  {photo.image_url ? (
                    <img
                      src={photo.image_url}
                      alt={photo.title ?? "Photo"}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full min-h-35 items-center justify-center px-3 text-center text-[11px] text-muted-foreground">
                      No image — add one via Edit
                    </div>
                  )}
                </div>

                <div className="flex min-h-0 flex-1 flex-col px-3 pt-2.5 pb-0">
                  <p className="text-sm font-semibold leading-tight tracking-tight line-clamp-3">
                    {photo.title?.trim() || "—"}
                  </p>
                  {photo.submitted_by ? (
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      Submitted by: {photo.submitted_by}
                    </p>
                  ) : null}
                </div>

                <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border/50 bg-muted/20 px-2 py-2">
                  {activeView === "requests" ? (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-8 px-3 text-xs font-medium"
                        onClick={async () => {
                          const res = await approvePhoto(photo.id);
                          if (!res.ok) {
                            toast.error(res.message);
                            return;
                          }
                          toast.success("Photo approved.");
                          router.refresh();
                        }}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-3 text-xs font-medium"
                        onClick={async () => {
                          const res = await rejectPhoto(photo.id);
                          if (!res.ok) {
                            toast.error(res.message);
                            return;
                          }
                          toast.success("Photo rejected.");
                          router.refresh();
                        }}
                      >
                        Reject
                      </Button>
                    </>
                  ) : null}
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-8 px-3 text-xs font-medium"
                    onClick={() => {
                      setEditing(photo);
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
                    onClick={() => setPhotoPendingDelete(photo)}
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
            <DialogTitle>Edit Photo</DialogTitle>
            <DialogDescription>
              Caption is optional. Replace the file only if you want a new
              image.
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <PhotoForm
              variant="edit"
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData();
                formData.append("title", values.title);
                if (file) formData.append("image", file);

                const res = await updatePhoto(editing.id, formData);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Photo updated.");
                setEditOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!photoPendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPhotoPendingDelete(null);
            setDeletePending(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this photo?</AlertDialogTitle>
            <AlertDialogDescription>
              {photoPendingDelete ? (
                <>
                  This will permanently remove{" "}
                  <span className="font-medium text-foreground">
                    {photoPendingDelete.title ?? "this photo"}
                  </span>{" "}
                  from the public gallery and CMS.
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
                if (!photoPendingDelete) return;
                setDeletePending(true);
                const res = await deletePhoto(photoPendingDelete.id);
                setDeletePending(false);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Photo deleted.");
                setPhotoPendingDelete(null);
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
