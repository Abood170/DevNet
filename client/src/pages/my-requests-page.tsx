import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Pagination } from "@/components/pagination";
import { useAuth } from "@/hooks/use-auth";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest } from "@/lib/queryClient";
import { JobApplicationWithDetails, PaginatedResponse, UserRole } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { Briefcase, MapPin, Building2, CheckCircle2, XCircle, Clock, FileText, Download } from "lucide-react";
import { Link } from "wouter";

export default function MyRequestsPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<PaginatedResponse<JobApplicationWithDetails>>({
    queryKey: [API_ENDPOINTS.MY_APPLICATIONS, page],
    queryFn: async () => {
      const res = await apiRequest("GET", `${API_ENDPOINTS.MY_APPLICATIONS}?page=${page}&limit=10`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load applications");
      return json.data;
    },
    enabled: !!user,
  });

  const getStatusBadge = (status: string | null | undefined) => {
    if (!status || status === "pending") {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
    }
    if (status === "approved") {
      return (
        <Badge variant="default" className="bg-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Approved
        </Badge>
      );
    }
    if (status === "rejected") {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <XCircle className="h-3 w-3" />
          Rejected
        </Badge>
      );
    }
    return <Badge variant="outline">{status}</Badge>;
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">My Applications</h1>
          <p className="text-muted-foreground">View the status of your job applications</p>
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
                You haven't applied to any jobs yet. Start exploring job opportunities!
              </p>
              <Button asChild>
                <Link href="/jobs">Browse Jobs</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {data?.items.map((application) => (
                <Card key={application.id} className="border bg-card">
                  <CardHeader>
                    <div className="flex items-start justify-between flex-wrap gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <CardTitle className="text-lg">{application.job?.title}</CardTitle>
                          <Badge variant="outline" size="sm">
                            {application.job?.company}
                          </Badge>
                          {getStatusBadge(application.status)}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
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
                      <Badge variant="secondary" className="flex-shrink-0">
                        Applied {formatDistanceToNow(new Date(application.createdAt), { addSuffix: true })}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {application.skills && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">Your Skills Submitted:</h4>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-md">
                          {application.skills}
                        </p>
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
                          View CV
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2 border-t flex-wrap">
                      <Button variant="outline" size="sm" asChild>
                        <Link href="/jobs">View Job</Link>
                      </Button>
                      {application.status === "approved" && (
                        <Badge variant="default" className="bg-green-600 ml-auto">
                          Congratulations! Your application was approved
                        </Badge>
                      )}
                      {application.status === "rejected" && (
                        <Badge variant="outline" className="ml-auto">
                          Keep applying to find your next opportunity
                        </Badge>
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

