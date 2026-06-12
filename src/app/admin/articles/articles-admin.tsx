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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DataTable, type DataTableColumn } from "@/components/data-table";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { compressImageFile } from "@/lib/image-compress";
import { hasMeaningfulHtml, stripHtml } from "@/lib/html";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ArticleContent } from "@/components/victor/ArticleContent";

import type { GermanTranslationMap } from "@/lib/content-translations/server";

import {
  createArticle,
  deleteArticle,
  updateArticle,
  uploadArticleContentImage,
} from "./_actions";
import { autoTranslateArticleFields } from "./_translate-actions";

const articleDialogClassName =
  "flex max-h-[90vh] w-[min(100vw-1.5rem,56rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl";

const articleDialogScrollClassName = "flex-1 overflow-y-auto px-6 py-4";

const articleSchema = z.object({
  title: z.string().min(1, "Title is required."),
  excerpt: z.string().optional(),
  content: z
    .string()
    .refine((v) => hasMeaningfulHtml(v), "Content is required."),
  category: z.string().optional(),
  author: z.string().optional(),
  is_published: z.boolean(),
  image: z.any().optional(),
  title_de: z.string().optional(),
  excerpt_de: z.string().optional(),
  content_de: z.string().optional(),
});

type ArticleRow = {
  id: string;
  title: string | null;
  excerpt: string | null;
  content: string | null;
  image_url: string | null;
  category?: string | null;
  author?: string | null;
  wp_post_id?: number | null;
  is_published?: boolean | null;
  created_at?: string | null;
};

type ArticleFormValues = z.infer<typeof articleSchema>;

function formatArticleDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function ArticleForm({
  initial,
  german,
  onCancel,
  onSubmit,
  variant = "edit",
}: {
  initial?: Partial<ArticleRow>;
  german?: { title_de?: string; excerpt_de?: string; content_de?: string };
  onCancel: () => void;
  onSubmit: (values: ArticleFormValues, file?: File) => Promise<void>;
  variant?: "create" | "edit";
}) {
  const router = useRouter();
  const form = useForm<ArticleFormValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: {
      title: initial?.title ?? "",
      excerpt: initial?.excerpt ?? "",
      content: initial?.content ?? "",
      category: initial?.category ?? "",
      author: initial?.author ?? "",
      is_published: initial?.is_published !== false,
      image: undefined,
      title_de: german?.title_de ?? "",
      excerpt_de: german?.excerpt_de ?? "",
      content_de: german?.content_de ?? "",
    },
    mode: "onChange",
  });

  const [pending, startTransition] = useTransition();
  const [translating, setTranslating] = React.useState(false);
  const watchedImage = form.watch("image") as FileList | undefined;

  const imageHint =
    variant === "create"
      ? "Optional cover image for listings."
      : "Leave empty to keep the current cover image.";

  async function handleAutoTranslate() {
    const title = form.getValues("title");
    const excerpt = form.getValues("excerpt") ?? "";
    const content = form.getValues("content");
    if (!title.trim() && !content.trim()) {
      toast.error("Add English title or content first.");
      return;
    }
    setTranslating(true);
    try {
      const res = await autoTranslateArticleFields(title, excerpt, content);
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      if (res.title_de) form.setValue("title_de", res.title_de);
      if (res.excerpt_de) form.setValue("excerpt_de", res.excerpt_de);
      if (res.content_de) form.setValue("content_de", res.content_de);
      toast.success("German text generated. Review and save.");
    } finally {
      setTranslating(false);
    }
  }

  async function handleSubmit(values: ArticleFormValues) {
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
        <Label htmlFor="article-title">Title</Label>
        <Input
          id="article-title"
          placeholder="e.g. Political renewal in Berlin"
          {...form.register("title")}
        />
        {form.formState.errors.title ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.title.message}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="article-category">Category (optional)</Label>
        <Input
          id="article-category"
          placeholder="e.g. Essays"
          {...form.register("category")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="article-author">Author (optional)</Label>
        <Input
          id="article-author"
          placeholder="e.g. Victor Grossman"
          {...form.register("author")}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="article-excerpt">Excerpt (optional)</Label>
        <Textarea
          id="article-excerpt"
          rows={3}
          placeholder="Short summary for cards and listings…"
          {...form.register("excerpt")}
        />
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <Controller
          control={form.control}
          name="content"
          render={({ field }) => (
            <RichTextEditor
              value={field.value}
              onChange={field.onChange}
              placeholder="Write the full article…"
              disabled={pending}
              onUploadImage={async (file) => {
                const formData = new FormData();
                formData.append("file", file);
                const res = await uploadArticleContentImage(formData);
                if (!res.ok) {
                  toast.error(res.message ?? "Image upload failed.");
                  return null;
                }
                return res.url;
              }}
            />
          )}
        />
        {form.formState.errors.content ? (
          <p className="text-sm text-destructive">
            {form.formState.errors.content.message}
          </p>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
        <div className="space-y-0.5">
          <Label htmlFor="article-published" className="text-sm font-medium">
            Published
          </Label>
          <p className="text-xs text-muted-foreground">
            When off, hide from public article lists (if your site checks this
            flag).
          </p>
        </div>
        <Controller
          control={form.control}
          name="is_published"
          render={({ field }) => (
            <Switch
              id="article-published"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="article-image">Cover image (optional)</Label>
        <Input
          id="article-image"
          type="file"
          accept="image/*"
          {...form.register("image")}
        />
        <p className="text-xs text-muted-foreground">{imageHint}</p>
      </div>

      <div className="space-y-4 rounded-lg border border-border/60 bg-muted/20 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium">German translation</p>
            <p className="text-xs text-muted-foreground">
              Shown when visitors switch the site to DE. Auto-fills on save if
              left empty, or use the button to preview first.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending || translating}
            onClick={handleAutoTranslate}
          >
            {translating ? "Translating…" : "Auto-translate"}
          </Button>
        </div>
        <div className="space-y-2">
          <Label htmlFor="article-title-de">Title (Deutsch)</Label>
          <Input
            id="article-title-de"
            placeholder="German title"
            {...form.register("title_de")}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="article-excerpt-de">Excerpt (Deutsch)</Label>
          <Textarea
            id="article-excerpt-de"
            rows={3}
            placeholder="German summary…"
            {...form.register("excerpt_de")}
          />
        </div>
        <div className="space-y-2">
          <Label>Content (Deutsch)</Label>
          <Controller
            control={form.control}
            name="content_de"
            render={({ field }) => (
              <RichTextEditor
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="German article text…"
                disabled={pending}
                onUploadImage={async (file) => {
                  const formData = new FormData();
                  formData.append("file", file);
                  const res = await uploadArticleContentImage(formData);
                  if (!res.ok) {
                    toast.error(res.message ?? "Image upload failed.");
                    return null;
                  }
                  return res.url;
                }}
              />
            )}
          />
        </div>
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

export function ArticlesAdmin({
  articles,
  germanById,
}: {
  articles: ArticleRow[];
  germanById: GermanTranslationMap;
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createNonce, setCreateNonce] = React.useState(0);
  const [editOpen, setEditOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ArticleRow | null>(null);
  const [viewing, setViewing] = React.useState<ArticleRow | null>(null);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState<ArticleRow | null>(null);

  const columns = React.useMemo<DataTableColumn<ArticleRow>[]>(
    () => [
      {
        key: "index",
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
            {stripHtml(row.content ?? "").slice(0, 180)}
            {stripHtml(row.content ?? "").length > 180 ? "…" : ""}
          </div>
        ),
      },
      {
        key: "category",
        header: "Category",
        sortable: true,
        sortValue: (r) => r.category ?? "",
        columnClassName: "w-[7rem] align-top",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {row.category ?? "—"}
          </span>
        ),
      },
      {
        key: "author",
        header: "Author",
        sortable: true,
        sortValue: (r) => r.author ?? "",
        columnClassName: "max-w-[8rem] align-top",
        render: (row) => (
          <span className="line-clamp-2 text-xs text-muted-foreground">
            {row.author ?? "—"}
          </span>
        ),
      },
      {
        key: "created_at",
        header: "Date",
        sortable: true,
        sortValue: (r) => r.created_at ?? "",
        columnClassName: "w-[7.5rem] whitespace-nowrap align-top",
        render: (row) => (
          <span className="text-xs text-muted-foreground">
            {formatArticleDate(row.created_at ?? null)}
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
          <h1 className="text-2xl font-semibold">Articles</h1>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <Button
            onClick={() => {
              setCreateNonce((n) => n + 1);
              setCreateOpen(true);
            }}
          >
            <Plus className="mr-2 size-4" />
            New Article
          </Button>
          <DialogContent className={articleDialogClassName} showCloseButton>
            <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
              <DialogHeader className="gap-1 text-left">
                <DialogTitle>Create Article</DialogTitle>
                <DialogDescription>
                  Add title, optional excerpt and cover, and full article
                  content.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className={articleDialogScrollClassName}>
              <ArticleForm
                key={`create-${createNonce}`}
                variant="create"
                onCancel={() => setCreateOpen(false)}
                onSubmit={async (values, file) => {
                  const formData = new FormData();
                  formData.append("title", values.title);
                  formData.append("excerpt", values.excerpt ?? "");
                  formData.append("content", values.content);
                  formData.append("category", values.category ?? "");
                  formData.append("author", values.author ?? "");
                  formData.append(
                    "is_published",
                    values.is_published ? "true" : "false",
                  );
                  if (file) formData.append("image", file);
                  formData.append("title_de", values.title_de ?? "");
                  formData.append("excerpt_de", values.excerpt_de ?? "");
                  formData.append("content_de", values.content_de ?? "");

                  const res = await createArticle(formData);
                  if (!res.ok) {
                    toast.error(res.message);
                    return;
                  }
                  toast.success("Article created.");
                  setCreateOpen(false);
                }}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full overflow-hidden rounded-xl border border-border/50 bg-card/30">
        {articles.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No articles yet. Use{" "}
            <span className="font-medium text-foreground">New Article</span> to
            add one.
          </div>
        ) : (
          <div className="w-full overflow-x-auto p-3 sm:p-4">
            <DataTable
              data={articles}
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
        <DialogContent className={articleDialogClassName} showCloseButton>
          {viewing ? (
            <>
              <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
                <DialogHeader className="gap-2 text-left">
                  <DialogTitle className="text-lg leading-snug sm:text-xl">
                    {viewing.title}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    Full article text and metadata.
                  </DialogDescription>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-left text-sm text-muted-foreground">
                    {viewing.category ? (
                      <span>
                        Category:{" "}
                        <span className="font-medium text-foreground">
                          {viewing.category}
                        </span>
                      </span>
                    ) : null}
                    {viewing.author ? (
                      <span>
                        Author:{" "}
                        <span className="font-medium text-foreground">
                          {viewing.author}
                        </span>
                      </span>
                    ) : null}
                    {viewing.wp_post_id != null ? (
                      <span>
                        WP post:{" "}
                        <span className="font-medium tabular-nums text-foreground">
                          {viewing.wp_post_id}
                        </span>
                      </span>
                    ) : null}
                    <span>
                      Added:{" "}
                      <span className="font-medium text-foreground">
                        {formatArticleDate(viewing.created_at ?? null)}
                      </span>
                    </span>
                    <span>
                      Status:{" "}
                      <span className="font-medium text-foreground">
                        {viewing.is_published === false ? "Draft" : "Published"}
                      </span>
                    </span>
                  </div>
                </DialogHeader>
              </div>
              <div className={articleDialogScrollClassName}>
                {viewing.image_url ? (
                  <div className="mb-4 overflow-hidden rounded-lg border border-border/60 bg-muted/20">
                    <img
                      src={viewing.image_url}
                      alt=""
                      className="max-h-48 w-full object-cover"
                    />
                  </div>
                ) : null}
                {viewing.excerpt ? (
                  <p className="mb-4 text-sm italic leading-relaxed text-muted-foreground">
                    {viewing.excerpt}
                  </p>
                ) : null}
                <ArticleContent
                  html={viewing.content ?? ""}
                  className="rounded-lg border border-border/60 bg-muted/20 p-4 prose-sm"
                />
              </div>
              <div
                role="group"
                aria-label="Article actions"
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
        <DialogContent className={articleDialogClassName} showCloseButton>
          <div className="shrink-0 border-b px-6 pt-6 pb-4 pr-14">
            <DialogHeader className="gap-1 text-left">
              <DialogTitle>Edit Article</DialogTitle>
              <DialogDescription>
                Update article details and optional cover image.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className={articleDialogScrollClassName}>
            {editing ? (
              <ArticleForm
                key={editing.id}
                variant="edit"
                initial={editing}
                german={germanById[editing.id]}
                onCancel={() => setEditOpen(false)}
                onSubmit={async (values, file) => {
                  const formData = new FormData();
                  formData.append("title", values.title);
                  formData.append("excerpt", values.excerpt ?? "");
                  formData.append("content", values.content);
                  formData.append("category", values.category ?? "");
                  formData.append("author", values.author ?? "");
                  formData.append(
                    "is_published",
                    values.is_published ? "true" : "false",
                  );
                  if (file) formData.append("image", file);
                  formData.append("title_de", values.title_de ?? "");
                  formData.append("excerpt_de", values.excerpt_de ?? "");
                  formData.append("content_de", values.content_de ?? "");

                  const res = await updateArticle(editing.id, formData);
                  if (!res.ok) {
                    toast.error(res.message);
                    return;
                  }
                  toast.success("Article updated.");
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
            <AlertDialogTitle>Delete Article?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete
              {deleting?.title
                ? ` article \"${deleting.title}\"`
                : " this article"}
              .
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!deleting) return;
                const res = await deleteArticle(deleting.id);
                if (!res.ok) {
                  toast.error(res.message);
                  return;
                }
                toast.success("Article deleted.");
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
