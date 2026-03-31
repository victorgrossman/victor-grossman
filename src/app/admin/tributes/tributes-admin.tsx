"use client";

import * as React from "react";
import { useTransition } from "react";
import { z } from "zod";
import { useRouter } from "next/navigation";

import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
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

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { compressImageFile } from "@/lib/image-compress";

import {
  approveTribute,
  createTribute,
  deleteTribute,
  rejectTribute,
  updateTribute,
} from "./_actions";

const tributeSchema = z.object({
  name: z.string().min(1, "Name is required."),
  message: z.string().min(1, "Message is required."),
  image: z.any().optional(),
});

export type TributeRow = {
  id: string;
  name: string | null;
  message: string | null;
  image_url: string | null;
  status: "pending" | "approved" | "rejected" | string | null;
};

type TributeFormValues = z.infer<typeof tributeSchema>;

function TributeForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<TributeRow>;
  onCancel: () => void;
  onSubmit: (values: TributeFormValues, file?: File) => Promise<void>;
}) {
  const router = useRouter();
  const form = useForm<TributeFormValues>({
    resolver: zodResolver(tributeSchema),
    defaultValues: {
      name: initial?.name ?? "",
      message: initial?.message ?? "",
      image: undefined,
    },
    mode: "onChange",
  });

  const [pending, startTransition] = useTransition();
  const watchedImage = form.watch("image") as FileList | undefined;

  async function handleSubmit(values: TributeFormValues) {
    const file = watchedImage?.[0];
    startTransition(async () => {
      const compressed = file ? await compressImageFile(file) : undefined;
      await onSubmit(values, compressed);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          placeholder="e.g. Sevim Dagdelen"
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.name.message}
          </p>
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
  );
}

export function TributesAdmin({ tributes }: { tributes: TributeRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<TributeRow | null>(null);
  const [activeView, setActiveView] = React.useState<"tributes" | "requests">(
    "tributes",
  );
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<TributeRow | null>(null);

  const requestTributes = React.useMemo(
    () => tributes.filter((t) => (t.status ?? "approved") === "pending"),
    [tributes],
  );
  const managedTributes = React.useMemo(
    () => tributes.filter((t) => (t.status ?? "approved") !== "pending"),
    [tributes],
  );
  const visibleTributes =
    activeView === "requests" ? requestTributes : managedTributes;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Tributes</h1>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant={activeView === "tributes" ? "default" : "outline"}
            onClick={() => setActiveView("tributes")}
          >
            Tributes
          </Button>
          <Button
            type="button"
            variant={activeView === "requests" ? "default" : "outline"}
            onClick={() => setActiveView("requests")}
          >
            Requests ({requestTributes.length})
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 size-4" />
              New Tribute
            </Button>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Tribute</DialogTitle>
                <DialogDescription>Add a new tribute.</DialogDescription>
              </DialogHeader>

              <TributeForm
                onCancel={() => setCreateOpen(false)}
                onSubmit={async (values, file) => {
                  const formData = new FormData();
                  formData.append("name", values.name);
                  formData.append("message", values.message);
                  if (file) formData.append("image", file);

                  const res = await createTribute(formData);
                  if (!res.ok) {
                    toast.error(res.message);
                    return;
                  }
                  toast.success("Tribute created.");
                  setCreateOpen(false);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {visibleTributes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          {activeView === "requests"
            ? "No pending tribute requests right now."
            : 'No tributes yet. Click "New Tribute" to add one.'}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleTributes.map((t) => (
            <Card key={t.id} className="border-border/60 bg-background/30">
              {t.image_url ? (
                <div className="h-40 w-full overflow-hidden rounded-t-xl">
                  <img
                    src={t.image_url}
                    alt={t.name ?? "Tribute"}
                    className="size-full object-cover"
                  />
                </div>
              ) : null}
              <CardContent className="flex flex-col gap-3 p-4">
                <div>
                  <p className="font-medium">{t.name}</p>
                  <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                    {t.message}
                  </p>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {activeView === "requests" ? (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={async () => {
                        const res = await approveTribute(t.id);
                        if (!res.ok) {
                          toast.error(res.message);
                          return;
                        }
                        toast.success("Tribute approved.");
                        router.refresh();
                      }}
                    >
                      Approve
                    </Button>
                  ) : null}
                  {activeView === "requests" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        const res = await rejectTribute(t.id);
                        if (!res.ok) {
                          toast.error(res.message);
                          return;
                        }
                        toast.success("Tribute rejected.");
                        router.refresh();
                      }}
                    >
                      Reject
                    </Button>
                  ) : null}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditing(t);
                      setEditOpen(true);
                    }}
                  >
                    <Pencil className="mr-1.5 size-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setDeleting(t);
                      setDeleteOpen(true);
                    }}
                  >
                    <Trash2 className="mr-1.5 size-3.5" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tribute</DialogTitle>
            <DialogDescription>Update tribute details.</DialogDescription>
          </DialogHeader>

          {editing ? (
            <TributeForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData();
                formData.append("name", values.name);
                formData.append("message", values.message);
                if (file) formData.append("image", file);

                const res = await updateTribute(editing.id, formData);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Tribute updated.");
                setEditOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tribute?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove
              {deleting?.name
                ? ` tribute by ${deleting.name}`
                : " this tribute"}
              from CMS and the public wall.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                const res = await deleteTribute(deleting.id);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Tribute deleted.");
                setDeleting(null);
                router.refresh();
              }}
            >
              Yes, delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
