import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { JobCard } from "@/components/job-card";
import { JobFormDialog } from "@/components/job-form-dialog";
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
import { JobWithEmployer, PaginatedResponse, InsertJob } from "@shared/schema";
import { Plus, Briefcase, Building2, MapPin, Globe } from "lucide-react";
import { Link } from "wouter";

export default function EmployerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobWithEmployer | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobWithEmployer | null>(null);

  const { data, isLoading, error } = useQuery<PaginatedResponse<JobWithEmployer>>({
    queryKey: [API_ENDPOINTS.MY_JOBS, page],
  });

  const createMutation = useMutation({
    mutationFn: async (jobData: InsertJob) => {
      const res = await apiRequest("POST", API_ENDPOINTS.JOBS, jobData);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to create job");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_JOBS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOBS] });
      setIsJobDialogOpen(false);
      toast({ title: "Success", description: "Job posted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertJob> }) => {
      const res = await apiRequest("PATCH", API_ENDPOINTS.JOB_BY_ID(id), data);
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to update job");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_JOBS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOBS] });
      setEditingJob(null);
      toast({ title: "Success", description: "Job updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", API_ENDPOINTS.JOB_BY_ID(id));
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to delete job");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_JOBS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOBS] });
      setDeletingJob(null);
      toast({ title: "Success", description: "Job deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingJob(null);
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

  const activeJobs = data?.items.filter(job => job.isActive).length || 0;

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
                <Badge variant="secondary" className="w-fit mx-auto mt-2">
                  Employer
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                {user?.bio && (
                  <p className="text-sm text-muted-foreground">{user.bio}</p>
                )}
                
                <div className="space-y-2 text-sm">
                  {user?.company && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <span>{user.company}</span>
                    </div>
                  )}
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

                <div className="pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{data?.total || 0}</p>
                      <p className="text-xs text-muted-foreground">Total Jobs</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-primary">{activeJobs}</p>
                      <p className="text-xs text-muted-foreground">Active</p>
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
                <h1 className="text-2xl font-bold mb-1">My Job Listings</h1>
                <p className="text-muted-foreground text-sm">
                  Manage your job postings
                </p>
              </div>
              <Button onClick={() => setIsJobDialogOpen(true)} className="gap-2" data-testid="button-dashboard-create-job">
                <Plus className="h-4 w-4" />
                Post Job
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <Card key={i} className="border bg-card">
                    <CardContent className="p-6">
                      <div className="space-y-3">
                        <Skeleton className="h-6 w-2/3" />
                        <div className="flex gap-4">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <Skeleton className="h-16 w-full" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card className="border bg-card">
                <CardContent className="py-16 text-center">
                  <p className="text-destructive mb-4">Failed to load jobs</p>
                  <Button variant="outline" onClick={() => window.location.reload()}>
                    Try Again
                  </Button>
                </CardContent>
              </Card>
            ) : data?.items.length === 0 ? (
              <Card className="border bg-card">
                <CardContent className="py-16 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No job listings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start attracting top talent by posting your first job!
                  </p>
                  <Button onClick={() => setIsJobDialogOpen(true)} data-testid="button-empty-dashboard-create-job">
                    Post Your First Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-4">
                  {data?.items.map((job) => (
                    <JobCard
                      key={job.id}
                      job={job}
                      isOwner={true}
                      onEdit={setEditingJob}
                      onDelete={setDeletingJob}
                      isDeleting={deleteMutation.isPending && deletingJob?.id === job.id}
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

      <JobFormDialog
        open={isJobDialogOpen}
        onOpenChange={setIsJobDialogOpen}
        onSubmit={(jobData) => createMutation.mutate(jobData)}
        isSubmitting={createMutation.isPending}
      />

      <JobFormDialog
        open={!!editingJob}
        onOpenChange={(open) => !open && setEditingJob(null)}
        job={editingJob}
        onSubmit={(jobData) => editingJob && updateMutation.mutate({ id: editingJob.id, data: jobData })}
        isSubmitting={updateMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingJob}
        onOpenChange={(open) => !open && setDeletingJob(null)}
        title="Delete Job Listing"
        description="Are you sure you want to delete this job listing? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingJob && deleteMutation.mutate(deletingJob.id)}
        isLoading={deleteMutation.isPending}
        variant="destructive"
      />
    </Layout>
  );
}
