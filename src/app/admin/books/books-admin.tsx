"use client";

import * as React from "react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { compressImageFile } from "@/lib/image-compress";

import { createBook, deleteBook, updateBook } from "./_actions";

const bookSchema = z.object({
  title: z.string().min(1, "Title is required."),
  author: z.string().min(1, "Author is required."),
  description: z.string().optional(),
  amazon_url: z.string().optional(),
  image: z.any().optional(),
});

export type BookRow = {
  id: string;
  title: string | null;
  author: string | null;
  description: string | null;
  image_url: string | null;
  amazon_url?: string | null;
};

type BookFormValues = z.infer<typeof bookSchema>;

function BookForm({
  initial,
  onCancel,
  onSubmit,
}: {
  initial?: Partial<BookRow>;
  onCancel: () => void;
  onSubmit: (values: BookFormValues, file?: File) => Promise<void>;
}) {
  const router = useRouter();
  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: initial?.title ?? "",
      author: initial?.author ?? "",
      description: initial?.description ?? "",
      amazon_url: initial?.amazon_url ?? "",
      image: undefined,
    },
    mode: "onChange",
  });

  const [pending, startTransition] = useTransition();
  const watchedImage = form.watch("image") as FileList | undefined;

  async function handleSubmit(values: BookFormValues) {
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
        <Label htmlFor="title">Book title</Label>
        <Input
          id="title"
          placeholder="e.g. Unterwegs zu Angela"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="author">Author</Label>
        <Input
          id="author"
          placeholder="e.g. Walter Kaufmann"
          {...form.register("author")}
        />
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
        <Label htmlFor="amazon_url">Amazon link (optional)</Label>
        <Input
          id="amazon_url"
          type="url"
          placeholder="https://www.amazon.de/dp/…"
          {...form.register("amazon_url")}
        />
        <p className="text-xs text-muted-foreground">
          Product page URL. Visitors can open it from the public Books section.
        </p>
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
  );
}

export function BooksAdmin({ books }: { books: BookRow[] }) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<BookRow | null>(null);
  const [bookPendingDelete, setBookPendingDelete] =
    React.useState<BookRow | null>(null);
  const [deletePending, setDeletePending] = React.useState(false);

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
              <DialogDescription>
                Add details and an optional cover image.
              </DialogDescription>
            </DialogHeader>

            <BookForm
              onCancel={() => setCreateOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData();
                formData.append("title", values.title);
                formData.append("author", values.author);
                formData.append("description", values.description ?? "");
                formData.append("amazon_url", values.amazon_url ?? "");
                if (file) formData.append("image", file);

                const res = await createBook(formData);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Book created.");
                setCreateOpen(false);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {books.length === 0 ? (
        <div className="rounded-lg bg-transparent p-8 text-center text-sm text-muted-foreground">
          No books yet. Click{" "}
          <span className="font-medium text-foreground">New Book</span> to add
          the first one.
        </div>
      ) : (
        <div className="grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {books.map((book) => (
            <Card
              key={book.id}
              className="border-border/60 bg-card/40 flex h-full flex-col gap-0! overflow-hidden p-0! py-0! shadow-sm ring-1 ring-border/50 transition-shadow hover:shadow-md"
            >
              {/* Cover: flush to card top — no extra padding from Card */}
              <div className="relative aspect-4/5 w-full shrink-0 bg-muted/25">
                {book.image_url ? (
                  <img
                    src={book.image_url}
                    alt={book.title ?? "Book cover"}
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full min-h-[140px] items-center justify-center px-3 text-center text-[11px] text-muted-foreground">
                    No cover
                  </div>
                )}
              </div>

              {/* Text: tight vertical rhythm, no loose space-y */}
              <div className="flex min-h-0 flex-1 flex-col px-3 pt-2.5 pb-0">
                <h3 className="text-sm font-semibold leading-tight tracking-tight line-clamp-2">
                  {book.title}
                </h3>
                <p className="mt-1 text-[11px] leading-tight text-muted-foreground line-clamp-1">
                  {book.author ?? "—"}
                </p>
                <p className="mt-1.5 min-h-11 text-xs leading-snug text-muted-foreground line-clamp-3">
                  {(book.description ?? "").trim() || "—"}
                </p>
                {book.amazon_url ? (
                  <p className="mt-1 truncate text-[10px] text-blue-600">
                    Amazon linked
                  </p>
                ) : null}
              </div>

              {/* Actions: Edit left, Delete right */}
              <div className="mt-auto flex shrink-0 items-center justify-between gap-2 border-t border-border/50 bg-muted/20 px-2 py-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-3 text-xs font-medium"
                  onClick={() => {
                    setEditing(book);
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
                  onClick={() => setBookPendingDelete(book)}
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Book</DialogTitle>
            <DialogDescription>
              Update fields and optionally replace the cover image.
            </DialogDescription>
          </DialogHeader>

          {editing ? (
            <BookForm
              initial={editing}
              onCancel={() => setEditOpen(false)}
              onSubmit={async (values, file) => {
                const formData = new FormData();
                formData.append("title", values.title);
                formData.append("author", values.author);
                formData.append("description", values.description ?? "");
                formData.append("amazon_url", values.amazon_url ?? "");
                if (file) formData.append("image", file);

                const res = await updateBook(editing.id, formData);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Book updated.");
                setEditOpen(false);
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!bookPendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setBookPendingDelete(null);
            setDeletePending(false);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this book?</AlertDialogTitle>
            <AlertDialogDescription>
              {bookPendingDelete ? (
                <>
                  This will permanently remove{" "}
                  <span className="font-medium text-foreground">
                    {bookPendingDelete.title ?? "this book"}
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
                if (!bookPendingDelete) return;
                setDeletePending(true);
                const res = await deleteBook(bookPendingDelete.id);
                setDeletePending(false);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Book deleted.");
                setBookPendingDelete(null);
                router.refresh();
              }}
            >
              {deletePending ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
