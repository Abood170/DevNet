import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { PostCard } from "@/components/post-card";
import { PostFormDialog } from "@/components/post-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PostWithAuthor, PaginatedResponse, InsertPost } from "@shared/schema";
import { Plus, FileText, MapPin, Globe, Code2 } from "lucide-react";
import { Link } from "wouter";

export default function DeveloperDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<PostWithAuthor | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostWithAuthor | null>(null);

  const { data, isLoading, error } = useQuery<PaginatedResponse<PostWithAuthor>>({
    queryKey: [API_ENDPOINTS.MY_POSTS, page],
  });

  const createMutation = useMutation({
    mutationFn: async (postData: InsertPost) => {
      const res = await apiRequest("POST", API_ENDPOINTS.POSTS, postData);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to create post");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_POSTS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POSTS] });
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
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to update post");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_POSTS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POSTS] });
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
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to delete post");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_POSTS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POSTS] });
      setDeletingPost(null);
      toast({ title: "Success", description: "Post deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingPost(null);
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const skills = user?.skills?.split(",").map((s) => s.trim()).filter(Boolean) || [];

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card className="border bg-card sticky top-24">
              <CardHeader className="text-center pb-4">
                <Avatar className="h-20 w-20 mx-auto mb-4">
                  {user?.avatarUrl && (
                    <AvatarImage 
                      src={API_ENDPOINTS.AVATAR_DOWNLOAD(user.avatarUrl.split("/").pop() || "")} 
                      alt={user.name}
                    />
                  )}
                  <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                    {user ? getInitials(user.name) : "?"}
                  </AvatarFallback>
                </Avatar>
                <CardTitle className="text-xl">{user?.name}</CardTitle>
                <CardDescription>@{user?.username}</CardDescription>
                <Badge variant="outline" className="w-fit mx-auto mt-2">
                  Developer
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.bio && (
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  {user?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{user.location}</span>
                    </div>
                  )}
                  {user?.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <a href={user.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary">
                        {user.website}
                      </a>
                    </div>
                  )}
                </div>

                {skills.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" size="sm">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{data?.total || 0}</p>
                      <p className="text-xs text-muted-foreground">Posts</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{skills.length}</p>
                      <p className="text-xs text-muted-foreground">Skills</p>
                    </div>
                  </div>
                </div>

                <Link href="/profile">
                  <Button variant="outline" className="w-full" data-testid="button-edit-profile">
                    Edit Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold mb-1">My Posts</h1>
                <p className="text-muted-foreground text-sm">
                  Manage your published content
                </p>
              </div>
              <Button onClick={() => setIsPostDialogOpen(true)} className="gap-2" data-testid="button-dashboard-create-post">
                <Plus className="h-4 w-4" />
                New Post
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
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
                  <p className="text-muted-foreground mb-4">
                    Start sharing your thoughts and projects with the community!
                  </p>
                  <Button onClick={() => setIsPostDialogOpen(true)} data-testid="button-empty-dashboard-create-post">
                    Create Your First Post
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {data?.items.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      isOwner={true}
                      onEdit={setEditingPost}
                      onDelete={setDeletingPost}
                      isDeleting={deleteMutation.isPending && deletingPost?.id === post.id}
                    />
                  ))}
                </div>
                
                {data && data.totalPages > 1 && (
                  <div className="mt-8">
                    <Pagination
                      page={page}
                      totalPages={data.totalPages}
                      onPageChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
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
        post={editingPost}
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
