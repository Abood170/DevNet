import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { JobWithEmployer, User, UserRole, PaginatedResponse } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { JobApplicationDialog } from "@/components/job-application-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  MapPin, 
  Briefcase, 
  DollarSign,
  Building2,
  Clock,
  MessageSquare,
  CheckCircle2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { Link } from "wouter";

interface JobCardProps {
  job: JobWithEmployer;
  isOwner?: boolean;
  onEdit?: (job: JobWithEmployer) => void;
  onDelete?: (job: JobWithEmployer) => void;
  isDeleting?: boolean;
}

type CommentItem = {
  id: number;
  jobId: number;
  authorId: number;
  parentCommentId?: number | null;
  content: string;
  createdAt: string | Date;
  author?: User;
};

export function JobCard({ job, isOwner, onEdit, onDelete, isDeleting }: JobCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<number | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState<Record<number, string>>({});
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);

  const skills = job.skills?.split(",").map((s) => s.trim()).filter(Boolean) || [];

  const isDeveloper = user?.role === UserRole.DEVELOPER;
  const isJobOwner = user?.id === job.employerId || user?.role === UserRole.ADMIN;
  const deadline = job.deadline ? new Date(job.deadline) : null;
  const isExpired = deadline ? deadline < new Date() : false;
  const canApply = isDeveloper && !isJobOwner && job.isActive && !isExpired;

  const { data: appliedStatus } = useQuery<{ applied: boolean }>({
    queryKey: [API_ENDPOINTS.JOB_APPLIED(job.id)],
    queryFn: async () => {
      if (!canApply) return { applied: false };
      const res = await apiRequest("GET", API_ENDPOINTS.JOB_APPLIED(job.id));
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to check application status");
      return json.data;
    },
    enabled: canApply && !!user,
  });

  const applyMutation = useMutation({
    mutationFn: async (data: { skills: string; cv: File | null }) => {
      const formData = new FormData();
      formData.append("skills", data.skills);
      if (data.cv) {
        formData.append("cv", data.cv);
      }

      const res = await fetch(API_ENDPOINTS.JOB_APPLY(job.id), {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || "Failed to apply");
      }

      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to apply");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOB_APPLIED(job.id)] });
      setApplicationDialogOpen(false);
      toast({ title: "Success", description: "Application submitted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const commentsQuery = useQuery<PaginatedResponse<CommentItem>>({
    queryKey: [API_ENDPOINTS.JOB_COMMENTS(job.id)],
    queryFn: async () => {
      const res = await apiRequest("GET", `${API_ENDPOINTS.JOB_COMMENTS(job.id)}?limit=50`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load comments");
      return json.data;
    },
    enabled: commentsOpen,
  });

  const addCommentMutation = useMutation({
    mutationFn: async (parentCommentId?: number | null) => {
      const content = parentCommentId ? replyText[parentCommentId] || "" : commentText;
      const res = await apiRequest("POST", API_ENDPOINTS.JOB_COMMENTS(job.id), { 
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
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOB_COMMENTS(job.id)] });
      toast({ title: "Success", description: "Comment added!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editCommentMutation = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: number; content: string }) => {
      const res = await apiRequest("PATCH", API_ENDPOINTS.JOB_COMMENT_BY_ID(commentId), { content });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to update comment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOB_COMMENTS(job.id)] });
      setEditingCommentId(null);
      setEditingCommentText("");
      toast({ title: "Success", description: "Comment updated!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: number) => {
      const res = await apiRequest("DELETE", API_ENDPOINTS.JOB_COMMENT_BY_ID(commentId));
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to delete comment");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOB_COMMENTS(job.id)] });
      toast({ title: "Success", description: "Comment deleted!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
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

  const formatSalary = () => {
    if (!job.salaryMin && !job.salaryMax) return null;
    const formatter = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });
    if (job.salaryMin && job.salaryMax) {
      return `${formatter.format(job.salaryMin)} - ${formatter.format(job.salaryMax)}`;
    }
    if (job.salaryMin) return `From ${formatter.format(job.salaryMin)}`;
    if (job.salaryMax) return `Up to ${formatter.format(job.salaryMax)}`;
    return null;
  };

  const getJobTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "full-time":
        return "default";
      case "remote":
        return "secondary";
      case "contract":
        return "outline";
      default:
        return "secondary";
    }
  };

  const salary = formatSalary();
  const commentsCount = commentsQuery.data?.total || 0;

  return (
    <Card className="border bg-card" data-testid={`card-job-${job.id}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h3 className="font-semibold text-lg truncate">{job.title}</h3>
            <Badge variant={getJobTypeBadgeVariant(job.jobType)} size="sm">
              {job.jobType}
            </Badge>
            {!job.isActive && (
              <Badge variant="secondary" size="sm">
                Closed
              </Badge>
            )}
            {isExpired && (
              <Badge variant="destructive" size="sm">
                Expired
              </Badge>
            )}
            {job.isAccessible && (
              <Badge variant="outline" size="sm" className="bg-green-50 dark:bg-green-950">
                ♿ Accessible
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1">
              <Building2 className="h-4 w-4" />
              <span>{job.company}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              <span>{job.location}</span>
            </div>
            {salary && (
              <div className="flex items-center gap-1">
                <DollarSign className="h-4 w-4" />
                <span>{salary}</span>
              </div>
            )}
            {deadline && (
              <div className="flex items-center gap-1">
                <Clock className={`h-4 w-4 ${isExpired ? "text-destructive" : "text-amber-600 dark:text-amber-500"}`} />
                <span className={isExpired ? "text-destructive font-medium" : "text-amber-700 dark:text-amber-400 font-medium"}>
                  Deadline: {deadline.toLocaleDateString()} {deadline.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {isOwner && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" data-testid={`button-job-menu-${job.id}`}>
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Job actions</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit?.(job)} data-testid={`menu-item-edit-job-${job.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete?.(job)} 
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
                data-testid={`menu-item-delete-job-${job.id}`}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? "Deleting..." : "Delete"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>
      
      <CardContent className="pb-3">
        <p className="text-muted-foreground line-clamp-3">{job.description}</p>
        {job.accommodations && job.isAccessible && (
          <div className="mt-3 p-2 bg-green-50 dark:bg-green-950 rounded-md">
            <p className="text-xs font-medium text-green-900 dark:text-green-100 mb-1">Accommodations:</p>
            <p className="text-xs text-green-800 dark:text-green-200">{job.accommodations}</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="pt-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 w-full">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => setCommentsOpen((v) => !v)}
            data-testid={`button-toggle-comments-${job.id}`}
          >
            <MessageSquare className="h-4 w-4" />
            Comments <span className="ml-1 text-muted-foreground">({commentsCount})</span>
          </Button>
          {canApply && (
            appliedStatus?.applied ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled
                data-testid={`button-applied-${job.id}`}
              >
                <CheckCircle2 className="h-4 w-4" />
                Applied
              </Button>
            ) : (
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setApplicationDialogOpen(true)}
                data-testid={`button-apply-${job.id}`}
              >
                <Briefcase className="h-4 w-4" />
                Apply
              </Button>
            )
          )}
        </div>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 w-full">
            {skills.slice(0, 5).map((skill) => (
              <Badge key={skill} variant="outline" size="sm">
                {skill}
              </Badge>
            ))}
            {skills.length > 5 && (
              <Badge variant="outline" size="sm">
                +{skills.length - 5} more
              </Badge>
            )}
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
                  data-testid={`button-add-comment-${job.id}`}
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
                            <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
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

        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}</span>
        </div>
      </CardFooter>

      <JobApplicationDialog
        open={applicationDialogOpen}
        onOpenChange={setApplicationDialogOpen}
        jobTitle={job.title}
        onSubmit={applyMutation.mutateAsync}
        isSubmitting={applyMutation.isPending}
      />
    </Card>
  );
}
