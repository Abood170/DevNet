import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/pagination";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { JobApplicationWithDetails, PaginatedResponse, UserRole } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, User, FileText, Download, MapPin, Building2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function RequestsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<PaginatedResponse<JobApplicationWithDetails>>({
    queryKey: [API_ENDPOINTS.EMPLOYER_APPLICATIONS, page],
    queryFn: async () => {
      const res = await apiRequest("GET", `${API_ENDPOINTS.EMPLOYER_APPLICATIONS}?page=${page}&limit=10`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load applications");
      return json.data;
    },
    enabled: (user?.role === UserRole.EMPLOYER || user?.role === UserRole.ADMIN) && !!user,
  });

  const approveMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const res = await apiRequest("POST", API_ENDPOINTS.APPLICATION_APPROVE(applicationId));
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to approve application");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.EMPLOYER_APPLICATIONS] });
      toast({ title: "Success", description: "Application approved successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (applicationId: number) => {
      const res = await apiRequest("POST", API_ENDPOINTS.APPLICATION_REJECT(applicationId));
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to reject application");
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.EMPLOYER_APPLICATIONS] });
      toast({ title: "Success", description: "Application rejected." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status || status === "pending") {
      return <Badge variant="outline">Pending</Badge>;
    }
    if (status === "approved") {
      return <Badge variant="default" className="bg-green-600">Approved</Badge>;
    }
    if (status === "rejected") {
      return <Badge variant="destructive">Rejected</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  if (user?.role !== UserRole.EMPLOYER && user?.role !== UserRole.ADMIN) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Card className="border bg-card">
            <CardContent className="py-16 text-center">
              <p className="text-destructive mb-4">Access denied. This page is for employers only.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Job Applications</h1>
          <p className="text-muted-foreground">View and manage applications for your job postings</p>
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
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border bg-card">
            <CardContent className="py-16 text-center">
              <p className="text-destructive mb-4">Failed to load applications</p>
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
              <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-4">
                Applications from developers will appear here when they apply to your jobs.
              </p>
              <Button asChild>
                <Link href="/jobs">View Jobs</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {data?.items.map((application) => (
                <Card key={application.id} className="border bg-card">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <CardTitle className="text-lg">{application.job?.title}</CardTitle>
                          <Badge variant="outline" size="sm">
                            {application.job?.company}
                          </Badge>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            <span>{application.job?.location}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            <span>{application.job?.jobType}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-4">
                        {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="border-t pt-4">
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Link href={`/user/${application.applicant?.id}`}>
                              <p className="font-semibold hover:text-primary cursor-pointer transition-colors">
                                {application.applicant?.name || "Unknown User"}
                              </p>
                            </Link>
                            {application.applicant?.username && (
                              <>
                                <span className="text-muted-foreground">@</span>
                                <Link href={`/user/${application.applicant.id}`}>
                                  <span className="text-sm text-muted-foreground hover:text-primary cursor-pointer transition-colors">
                                    {application.applicant.username}
                                  </span>
                                </Link>
                              </>
                            )}
                          </div>
                          {application.applicant?.location && (
                            <p className="text-sm text-muted-foreground">{application.applicant.location}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {application.skills && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Skills:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{application.skills}</p>
                      </div>
                    )}

                    {application.cvUrl && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={application.cvUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline flex items-center gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Download CV
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/user/${application.applicant?.id}`}>
                          View Profile
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/jobs">View Job</Link>
                      </Button>
                      {(!application.status || application.status === "pending") && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => approveMutation.mutate(application.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            {approveMutation.isPending && approveMutation.variables === application.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Approving...
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Approve
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => rejectMutation.mutate(application.id)}
                            disabled={approveMutation.isPending || rejectMutation.isPending}
                          >
                            {rejectMutation.isPending && rejectMutation.variables === application.id ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Rejecting...
                              </>
                            ) : (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Reject
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
    </Layout>
  );
}

