import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PostWithAuthor, PaginatedResponse, User, UserRole } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { API_ENDPOINTS } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Pencil, Trash2, Clock, Heart, MessageSquare } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

type PostWithCounts = PostWithAuthor & {
  likesCount?: number;
  commentsCount?: number;
};

type CommentItem = {
  id: number;
  postId: number;
  authorId: number;
  parentCommentId?: number | null;
  content: string;
  createdAt: string | Date;
  author?: User;
};

interface PostCardProps {
  post: PostWithCounts;
  isOwner?: boolean;
  onEdit?: (post: PostWithAuthor) => void;
  onDelete?: (post: PostWithAuthor) => void;
  isDeleting?: boolean;
}

export function PostCard({ post, isOwner, onEdit, onDelete, isDeleting }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [expanded, setExpanded] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  
  const [commentText, setCommentText] = useState("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});

  
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const initialLikes = post.likesCount ?? 0;
  const initialComments = post.commentsCount ?? 0;

  const [likesCount, setLikesCount] = useState<number>(initialLikes);
  const [commentsCount, setCommentsCount] = useState<number>(initialComments);

  const tags = useMemo(
    () => post.tags?.split(",").map((t) => t.trim()).filter(Boolean) || [],
    [post.tags]
  );

  const shouldTruncate = post.content.length > 300;
  const displayContent =
    shouldTruncate && !expanded ? post.content.slice(0, 300) + "..." : post.content;

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const getAvatarUrl = (user: any) => {
    if (!user?.avatarUrl) return null;
    const filename = user.avatarUrl.split("/").pop();
    return filename ? API_ENDPOINTS.AVATAR_DOWNLOAD(filename) : null;
  };

  
  const commentsQuery = useQuery<PaginatedResponse<CommentItem>>({
    queryKey: ["post-comments", post.id],
    enabled: commentsOpen,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/posts/${post.id}/comments?page=1&limit=10`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load comments");
      return json.data;
    },
  });

  const invalidateCommentsAndFeed = () => {
    queryClient.invalidateQueries({ queryKey: ["post-comments", post.id] });
    queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
  };

  
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be logged in");
      const res = await apiRequest("POST", `/api/posts/${post.id}/like`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to like post");
      return json.data as { liked: boolean; likesCount: number };
    },
    onSuccess: (data) => {
      setLikesCount(data.likesCount);
      queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  
  const addCommentMutation = useMutation({
    mutationFn: async (parentCommentId?: number | null) => {
      if (!user) throw new Error("You must be logged in");
      const content = parentCommentId ? replyText[parentCommentId] || "" : commentText;
      const res = await apiRequest("POST", `/api/posts/${post.id}/comments`, { 
        content,
        parentCommentId: parentCommentId || null
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to add comment");
      return json.data;
    },
    onSuccess: (_, parentCommentId) => {
      if (parentCommentId) {
        setReplyText((prev) => {
          const next = { ...prev };
          delete next[parentCommentId];
          return next;
        });
        setReplyingToCommentId(null);
      } else {
        setCommentText("");
      }
      setCommentsCount((c) => c + 1);
      invalidateCommentsAndFeed();
      toast({ title: "Success", description: "Comment added" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  
  
  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      if (!user) throw new Error("You must be logged in");
      const res = await apiRequest("PATCH", `/api/comments/${commentId}`, { content });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to update comment");
      return json.data;
    },
    onSuccess: () => {
      setEditingCommentId(null);
      setEditingCommentText("");
      invalidateCommentsAndFeed();
      toast({ title: "Success", description: "Comment updated" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  
  
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      if (!user) throw new Error("You must be logged in");
      const res = await apiRequest("DELETE", `/api/comments/${commentId}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to delete comment");
      return json.data;
    },
    onSuccess: () => {
      setCommentsCount((c) => Math.max(0, c - 1));
      invalidateCommentsAndFeed();
      toast({ title: "Success", description: "Comment deleted" });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const canManageComment = (c: CommentItem) => {
    if (!user) return false;
    return user.id === c.authorId || user.role === UserRole.ADMIN;
  };

  const startEdit = (c: CommentItem) => {
    setEditingCommentId(c.id);
    setEditingCommentText(c.content);
  };

  const cancelEdit = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const confirmDelete = (commentId: number) => {
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;
    deleteCommentMutation.mutate(commentId);
  };

  
  const organizeComments = (comments: CommentItem[]) => {
    const commentMap = new Map<number, CommentItem & { replies: CommentItem[] }>();
    const rootComments: (CommentItem & { replies: CommentItem[] })[] = [];

    
    comments.forEach((comment) => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    
    comments.forEach((comment) => {
      const commentWithReplies = commentMap.get(comment.id)!;
      if (comment.parentCommentId) {
        const parent = commentMap.get(comment.parentCommentId);
        if (parent) {
          parent.replies.push(commentWithReplies);
        } else {
          
          rootComments.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments;
  };

  const organizedComments = commentsQuery.data?.items 
    ? organizeComments(commentsQuery.data.items)
    : [];

  return (
    <Card className="border bg-card" data-testid={`card-post-${post.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {getAvatarUrl(post.author) && (
              <AvatarImage src={getAvatarUrl(post.author)!} alt={post.author.name} />
            )}
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {getInitials(post.author.name)}
            </AvatarFallback>
          </Avatar>

          <div>
            <Link href={`/user/${post.author.id}`}>
              <p className="font-medium leading-none mb-1 hover:text-primary cursor-pointer transition-colors">
                {post.author.name}
              </p>
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href={`/user/${post.author.id}`}>
                <span className="hover:text-primary cursor-pointer transition-colors">@{post.author.username}</span>
              </Link>
              <span className="text-xs">•</span>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              </div>
            </div>
          </div>
        </div>

        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`button-post-menu-${post.id}`}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Post actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(post)} data-testid={`menu-item-edit-post-${post.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete?.(post)}
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
                data-testid={`menu-item-delete-post-${post.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="pb-3">
        <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
        <p className="text-muted-foreground whitespace-pre-wrap">{displayContent}</p>

        {shouldTruncate && (
          <Button
            variant="link"
            className="px-0 h-auto text-primary"
            onClick={() => setExpanded(!expanded)}
            data-testid={`button-expand-post-${post.id}`}
          >
            {expanded ? "Show less" : "Read more"}
          </Button>
        )}
      </CardContent>

      <CardFooter className="pt-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => likeMutation.mutate()}
            disabled={!user || likeMutation.isPending}
            data-testid={`button-like-post-${post.id}`}
          >
            <Heart className="h-4 w-4" />
            Like <span className="ml-1 text-muted-foreground">({likesCount})</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setCommentsOpen((v) => !v)}
            data-testid={`button-toggle-comments-${post.id}`}
          >
            <MessageSquare className="h-4 w-4" />
            Comments <span className="ml-1 text-muted-foreground">({commentsCount})</span>
          </Button>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {commentsOpen && (
          <div className="w-full border rounded-md p-3 space-y-3">
            {}
            <div className="space-y-2">
              <Textarea
                placeholder={user ? "Write a comment..." : "Login to comment"}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={!user || addCommentMutation.isPending}
              />
              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={() => addCommentMutation.mutate(null)}
                  disabled={!user || addCommentMutation.isPending || commentText.trim().length === 0}
                  data-testid={`button-add-comment-${post.id}`}
                >
                  {addCommentMutation.isPending ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>

            {}
            {commentsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            ) : commentsQuery.error ? (
              <p className="text-sm text-destructive">Failed to load comments</p>
            ) : organizedComments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (
              <div className="space-y-2">
                {organizedComments.map((c) => {
                  const renderComment = (comment: CommentItem & { replies?: CommentItem[] }, depth = 0) => {
                    const isEditing = editingCommentId === comment.id;
                    const isReplying = replyingToCommentId === comment.id;

                    return (
                      <div key={comment.id} className="space-y-2">
                        <div className={`rounded-md bg-muted/40 p-2 space-y-2 ${depth > 0 ? 'ml-6 border-l-2 border-primary/20' : ''}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              {comment.author ? (
                                <>
                                  <Link href={`/user/${comment.author.id}`}>
                                    <p className="text-sm font-medium hover:text-primary cursor-pointer transition-colors">
                                      {comment.author.name}{" "}
                                      <span className="text-xs text-muted-foreground">@{comment.author.username}</span>
                                    </p>
                                  </Link>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm font-medium">User</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                  </p>
                                </>
                              )}
                            </div>

                            <div className="flex gap-2">
                              {user && !isEditing && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setReplyingToCommentId(comment.id);
                                    setReplyText((prev) => ({ ...prev, [comment.id]: "" }));
                                  }}
                                  className="text-xs"
                                >
                                  Reply
                                </Button>
                              )}
                              {canManageComment(comment) && (
                                <>
                                  {!isEditing && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => startEdit(comment)}
                                        data-testid={`button-edit-comment-${comment.id}`}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => confirmDelete(comment.id)}
                                        disabled={deleteCommentMutation.isPending}
                                        data-testid={`button-delete-comment-${comment.id}`}
                                      >
                                        Delete
                                      </Button>
                                    </>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2">
                              <Textarea
                                value={editingCommentText}
                                onChange={(e) => setEditingCommentText(e.target.value)}
                                disabled={editCommentMutation.isPending}
                              />
                              <div className="flex justify-end gap-2">
                                <Button variant="outline" size="sm" onClick={cancelEdit}>
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    editCommentMutation.mutate({
                                      commentId: comment.id,
                                      content: editingCommentText,
                                    })
                                  }
                                  disabled={editCommentMutation.isPending || editingCommentText.trim().length === 0}
                                  data-testid={`button-save-comment-${comment.id}`}
                                >
                                  {editCommentMutation.isPending ? "Saving..." : "Save"}
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
                          )}

                          {isReplying && (
                            <div className="space-y-2 mt-2">
                              <Textarea
                                placeholder="Write a reply..."
                                value={replyText[comment.id] || ""}
                                onChange={(e) => setReplyText((prev) => ({ ...prev, [comment.id]: e.target.value }))}
                                disabled={addCommentMutation.isPending}
                              />
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setReplyingToCommentId(null);
                                    setReplyText((prev) => {
                                      const next = { ...prev };
                                      delete next[comment.id];
                                      return next;
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => addCommentMutation.mutate(comment.id)}
                                  disabled={addCommentMutation.isPending || !replyText[comment.id]?.trim()}
                                >
                                  {addCommentMutation.isPending ? "Posting..." : "Post Reply"}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>

                        {}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="space-y-2">
                            {comment.replies.map((reply) => renderComment(reply, depth + 1))}
                          </div>
                        )}
                      </div>
                    );
                  };

                  return renderComment(c);
                })}
              </div>
            )}
          </div>
        )}
      </CardFooter>
    </Card>
  );
}
