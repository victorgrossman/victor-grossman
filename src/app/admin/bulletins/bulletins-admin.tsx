"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { z } from "zod";

import { toast } from "sonner";
import { Eye, Plus, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { DataTable, type DataTableColumn } from "@/components/data-table";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createBulletin, deleteBulletin, updateBulletin } from "./_actions";

/** Wide dialogs so long bulletin text is readable (matches full content width). */
const bulletinDialogClassName =
  "flex max-h-[90vh] w-[min(100vw-1.5rem,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl";

const bulletinDialogScrollClassName = "flex-1 overflow-y-auto px-6 py-4";

const bulletinSchema = z.object({
  bulletin_number: z.string().optional(),
  title: z.string().min(1, "Title is required."),
  content: z.string().min(1, "Content is required."),
  published_date: z.string().optional(),
});

export type BulletinRow = {
  id: string;
  bulletin_number: string | null;
  title: string | null;
  content: string | null;
  published_date: string | null;
};

type BulletinFormValues = z.infer<typeof bulletinSchema>;

function BulletinForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<BulletinRow>;
  onCancel: () => void;
  onSubmit: (values: BulletinFormValues) => Promise<void>;
}) {
  const router = useRouter();
  const form = useForm<BulletinFormValues>({
    resolver: zodResolver(bulletinSchema),
    defaultValues: {
      bulletin_number: initial?.bulletin_number ?? "",
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      published_date: initial?.published_date ?? "",
    },
    mode: "onChange",
  });

  const [pending, startTransition] = useTransition();

  async function handleSubmit(values: BulletinFormValues) {
    startTransition(async () => {
      await onSubmit(values);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={form.handleSubmit(handleSubmit)}
      className="flex flex-col gap-4"
    >
      <div className="space-y-2">
        <Label htmlFor="bulletin_number">Bulletin number</Label>
        <Input
          id="bulletin_number"
          placeholder="e.g. No. 144"
          {...form.register("bulletin_number")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          placeholder="e.g. Easter March for Peace"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Content</Label>
        <Textarea
          id="content"
          rows={10}
          placeholder="Full bulletin text..."
          {...form.register("content")}
        />
        {form.formState.errors.content ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.content.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="published_date">Published date (optional)</Label>
        <Input
          id="published_date"
          type="date"
          {...form.register("published_date")}
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

export function BulletinsAdmin({ bulletins }: { bulletins: BulletinRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BulletinRow | null>(null);
  const [viewing, setViewing] = React.useState<BulletinRow | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<BulletinRow | null>(null);

  const columns = React.useMemo<DataTableColumn<BulletinRow>[]>(
    () => [
      {
        key: "bulletin_number",
        header: "#",
        columnClassName: "w-10 text-center align-middle",
        render: (_row, index) => (
          <span className="font-medium tabular-nums text-xs text-muted-foreground">
            {index + 1}
          </span>
        ),
      },
      {
        key: "title",
        header: "Title",
        sortable: true,
        sortValue: (r) => r.title ?? "",
        columnClassName: "min-w-[11rem] max-w-[16rem] align-top",
        render: (row) => (
          <span className="line-clamp-2 font-medium text-sm leading-snug">
            {row.title}
          </span>
        ),
      },
      {
        key: "content",
        header: "Preview",
        columnClassName: "min-w-0 align-top whitespace-normal",
        render: (row) => (
          <div className="wrap-break-word text-xs leading-relaxed text-muted-foreground line-clamp-2">
            {(row.content ?? "").slice(0, 180)}
            {(row.content ?? "").length > 180 ? "…" : ""}
          </div>
        ),
      },
      {
        key: "published_date",
        header: "Date",
        sortable: true,
        sortValue: (r) => r.published_date ?? "",
        columnClassName: "w-[7.5rem] whitespace-nowrap align-top",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.published_date ?? "—"}
          </span>
        ),
      },
      {
        key: "actions",
        header: "Actions",
        columnClassName: "w-[8.5rem] text-right align-middle",
        render: (row) => (
          <div className="flex items-center justify-end gap-0.5">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              title="View"
              onClick={() => setViewing(row)}
            >
              <Eye className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8"
              title="Edit"
              onClick={() => {
                setEditing(row);
                setEditOpen(true);
              }}
            >
              <Pencil className="size-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="size-8 text-destructive hover:text-destructive"
              title="Delete"
              onClick={() => {
                setDeleting(row);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ),
      },
    ],
    [router],
  );

  return (
    <div className="w-full max-w-full space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Bulletins</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" />
            New Bulletin
          </Button>
          <DialogContent className={bulletinDialogClassName} showCloseButton>
            <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
              <DialogHeader className="gap-1 text-left">
                <DialogTitle>Create Bulletin</DialogTitle>
                <DialogDescription>
                  Add a Berlin Bulletin entry with number, title, and content.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className={bulletinDialogScrollClassName}>
              <BulletinForm
                onCancel={() => setCreateOpen(false)}
                onSubmit={async (values) => {
                  const formData = new FormData();
                  formData.append(
                    "bulletin_number",
                    values.bulletin_number ?? "",
                  );
                  formData.append("title", values.title);
                  formData.append("content", values.content);
                  formData.append(
                    "published_date",
                    values.published_date ?? "",
                  );

                  const res = await createBulletin(formData);
                  if (!res.ok) {
                    toast.error(res.message);
                    return;
                  }
                  toast.success("Bulletin created.");
                  setCreateOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-border/50 bg-card/30">
        {bulletins.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No bulletins yet. Use{" "}
            <span className="font-medium text-foreground">New Bulletin</span> to
            add one.
          </div>
        ) : (
          <div className="w-full overflow-x-auto p-3 sm:p-4">
            <DataTable
              data={bulletins}
              columns={columns}
              tableClassName="w-full min-w-[min(100%,52rem)] table-auto"
            />
          </div>
        )}
      </div>

      <Dialog
        open={!!viewing}
        onOpenChange={(open) => !open && setViewing(null)}
      >
        <DialogContent className={bulletinDialogClassName} showCloseButton>
          {viewing ? (
            <>
              <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
                <DialogHeader className="gap-2 text-left">
                  <DialogTitle className="text-lg leading-snug sm:text-xl">
                    {viewing.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Full bulletin text and publication details.
                  </DialogDescription>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-left text-sm text-muted-foreground">
                    {viewing.bulletin_number ? (
                      <span>
                        Number:{" "}
                        <span className="font-medium text-foreground">
                          {viewing.bulletin_number}
                        </span>
                      </span>
                    ) : null}
                    {viewing.published_date ? (
                      <span>
                        Published:{" "}
                        <span className="font-medium text-foreground">
                          {viewing.published_date}
                        </span>
                      </span>
                    ) : (
                      <span>No date set</span>
                    )}
                  </div>
                </DialogHeader>
              </div>
              <div className={bulletinDialogScrollClassName}>
                <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm leading-relaxed whitespace-pre-wrap">
                  {viewing.content ?? "—"}
                </div>
              </div>
              {/* Custom footer: avoid DialogFooter default -mx/-mb and justify-end that misalign buttons */}
              <div
                role="group"
                aria-label="Bulletin actions"
                className="flex shrink-0 flex-row flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/40 px-6 py-4"
              >
                <Button
                  type="button"
                  variant="outline"
                  className="min-w-22"
                  onClick={() => setViewing(null)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  className="min-w-22"
                  onClick={() => {
                    const row = viewing;
                    setViewing(null);
                    if (row) {
                      setEditing(row);
                      setEditOpen(true);
                    }
                  }}
                >
                  Edit
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className={bulletinDialogClassName} showCloseButton>
          <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle>Edit Bulletin</DialogTitle>
              <DialogDescription>Update bulletin details.</DialogDescription>
            </DialogHeader>
          </div>
          <div className={bulletinDialogScrollClassName}>
            {editing ? (
              <BulletinForm
                initial={editing}
                onCancel={() => setEditOpen(false)}
                onSubmit={async (values) => {
                  const formData = new FormData();
                  formData.append(
                    "bulletin_number",
                    values.bulletin_number ?? "",
                  );
                  formData.append("title", values.title);
                  formData.append("content", values.content);
                  formData.append(
                    "published_date",
                    values.published_date ?? "",
                  );

                  const res = await updateBulletin(editing.id, formData);
                  if (!res.ok) {
                    toast.error(res.message);
                    return;
                  }
                  toast.success("Bulletin updated.");
                  setEditOpen(false);
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bulletin?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              {deleting?.title
                ? ` bulletin \"${deleting.title}\"`
                : " this bulletin"}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                const res = await deleteBulletin(deleting.id);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Bulletin deleted.");
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
