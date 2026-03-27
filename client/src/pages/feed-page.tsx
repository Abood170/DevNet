import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PostCard } from "@/components/post-card";
import { PostFormDialog } from "@/components/post-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PostWithAuthor, PaginatedResponse, InsertPost, UserRole } from "@shared/schema";
import { Plus, FileText } from "lucide-react";


type PostWithCounts = PostWithAuthor & {
  likesCount?: number;
  commentsCount?: number;
};

export default function FeedPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [tag, setTag] = useState("");

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithCounts | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostWithCounts | null>(null);

  const { data, isLoading, error } = useQuery<PaginatedResponse<PostWithCounts>>({
    queryKey: ["posts", page, q, tag],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (q.trim()) params.set("q", q.trim());
      if (tag.trim()) params.set("tag", tag.trim());

      const res = await apiRequest("GET", `${API_ENDPOINTS.POSTS}?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load posts");
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (postData: InsertPost) => {
      const res = await apiRequest("POST", API_ENDPOINTS.POSTS, postData);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to create post");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setIsPostDialogOpen(false);
      toast({ title: "Success", description: "Post created successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertPost> }) => {
      const res = await apiRequest("PATCH", API_ENDPOINTS.POST_BY_ID(id), data);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to update post");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setEditingPost(null);
      toast({ title: "Success", description: "Post updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", API_ENDPOINTS.POST_BY_ID(id));
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to delete post");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      setDeletingPost(null);
      toast({ title: "Success", description: "Post deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingPost(null);
    },
  });

  const handleEdit = (post: PostWithCounts) => setEditingPost(post);
  const handleDelete = (post: PostWithCounts) => setDeletingPost(post);

  const canPost = user?.role === UserRole.DEVELOPER || user?.role === UserRole.ADMIN;

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Community Feed</h1>
            <p className="text-muted-foreground">Discover posts from developers around the world</p>
          </div>
          {canPost && (
            <Button onClick={() => setIsPostDialogOpen(true)} className="gap-2" data-testid="button-create-post">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          )}
        </div>

        <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Search posts..."
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
          <Input
            placeholder="Filter by tag (e.g. react)"
            value={tag}
            onChange={(e) => {
              setPage(1);
              setTag(e.target.value);
            }}
          />
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border bg-card">
                <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border bg-card">
            <CardContent className="py-16 text-center">
              <p className="text-destructive mb-4">Failed to load posts</p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Try Again
              </Button>
            </CardContent>
          </Card>
        ) : data?.items.length === 0 ? (
          <Card className="border bg-card">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to share something with the community!</p>
              {canPost && (
                <Button onClick={() => setIsPostDialogOpen(true)} data-testid="button-empty-create-post">
                  Create First Post
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {data?.items.map((post) => (
                <PostCard
                  key={post.id}
                  post={post as any}
                  isOwner={user?.id === post.authorId || user?.role === UserRole.ADMIN}
                  onEdit={handleEdit as any}
                  onDelete={handleDelete as any}
                  isDeleting={deleteMutation.isPending && deletingPost?.id === post.id}
                />
              ))}
            </div>

            {data && data.totalPages > 1 && (
              <div className="mt-8">
                <Pagination page={page} totalPages={data.totalPages} onPageChange={setPage} />
              </div>
            )}
          </>
        )}
      </div>

      <PostFormDialog
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
        onSubmit={(postData) => createMutation.mutate(postData)}
        isSubmitting={createMutation.isPending}
      />

      <PostFormDialog
        open={!!editingPost}
        onOpenChange={(open) => !open && setEditingPost(null)}
        post={editingPost as any}
        onSubmit={(postData) => editingPost && updateMutation.mutate({ id: editingPost.id, data: postData })}
        isSubmitting={updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingPost}
        onOpenChange={(open) => !open && setDeletingPost(null)}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingPost && deleteMutation.mutate(deletingPost.id)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </Layout>
  );
}
