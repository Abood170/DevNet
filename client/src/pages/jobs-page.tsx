import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { JobCard } from "@/components/job-card";
import { JobFormDialog } from "@/components/job-form-dialog";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JobWithEmployer, PaginatedResponse, InsertJob, UserRole } from "@shared/schema";
import { Plus, Briefcase } from "lucide-react";

export default function JobsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [page, setPage] = useState(1);
  const [isJobDialogOpen, setIsJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobWithEmployer | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobWithEmployer | null>(null);

  
  const [accessibleOnly, setAccessibleOnly] = useState(false);

  
  const jobsUrl = useMemo(() => {
    const base = API_ENDPOINTS.JOBS; 
    const params = new URLSearchParams();
    params.set("page", String(page));
    
    

    if (accessibleOnly) {
      params.set("isAccessible", "true");
    }

    return `${base}?${params.toString()}`;
  }, [page, accessibleOnly]);

  const { data, isLoading, error } = useQuery<PaginatedResponse<JobWithEmployer>>({
    
    queryKey: [API_ENDPOINTS.JOBS, page, accessibleOnly],
    queryFn: async () => {
      const res = await apiRequest("GET", jobsUrl);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load jobs");
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (jobData: InsertJob) => {
      const res = await apiRequest("POST", API_ENDPOINTS.JOBS, jobData);
      const data = await res.json();
      if (!data.success) throw new Error(data.error?.message || "Failed to create job");
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_JOBS] });
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
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_JOBS] });
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
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOBS] });
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.MY_JOBS] });
      setDeletingJob(null);
      toast({ title: "Success", description: "Job deleted successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingJob(null);
    },
  });

  const handleEdit = (job: JobWithEmployer) => setEditingJob(job);
  const handleDelete = (job: JobWithEmployer) => setDeletingJob(job);

  const canPostJob = user?.role === UserRole.EMPLOYER || user?.role === UserRole.ADMIN;

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Job Listings</h1>
            <p className="text-muted-foreground">Discover opportunities from top companies</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Checkbox
                id="accessible-only"
                checked={accessibleOnly}
                onCheckedChange={(v) => {
                  const next = v === true;
                  setAccessibleOnly(next);
                  setPage(1); 
                }}
                data-testid="checkbox-accessible-only"
              />
              <Label htmlFor="accessible-only" className="cursor-pointer text-sm">
                Accessible only (Disability-friendly)
              </Label>
            </div>

            {canPostJob && (
              <Button
                onClick={() => setIsJobDialogOpen(true)}
                className="gap-2"
                data-testid="button-create-job"
              >
                <Plus className="h-4 w-4" />
                Post Job
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border bg-card">
                <CardContent className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-2/3" />
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-16 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
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
              <h3 className="text-lg font-semibold mb-2">
                {accessibleOnly ? "No accessible jobs found" : "No job listings yet"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {accessibleOnly
                  ? "Try turning off the filter or check back soon."
                  : "Check back soon for new opportunities!"}
              </p>
              {canPostJob && (
                <Button onClick={() => setIsJobDialogOpen(true)} data-testid="button-empty-create-job">
                  Post First Job
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {data?.items.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isOwner={user?.id === job.employerId || user?.role === UserRole.ADMIN}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isDeleting={deleteMutation.isPending && deletingJob?.id === job.id}
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
