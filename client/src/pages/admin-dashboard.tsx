import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Pagination } from "@/components/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, PostWithAuthor, JobWithEmployer, PaginatedResponse, UserRole } from "@shared/schema";
import { Users, FileText, Briefcase, Ban, Check, Trash2, Shield, Search, Crown } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("users");
  const [usersPage, setUsersPage] = useState(1);
  const [postsPage, setPostsPage] = useState(1);
  const [jobsPage, setJobsPage] = useState(1);
  const [disablingUser, setDisablingUser] = useState<User | null>(null);
  const [enablingUser, setEnablingUser] = useState<User | null>(null);
  const [deletingPost, setDeletingPost] = useState<PostWithAuthor | null>(null);
  const [deletingJob, setDeletingJob] = useState<JobWithEmployer | null>(null);
  const [promotingUser, setPromotingUser] = useState<User | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
  const [userStatusFilter, setUserStatusFilter] = useState<string>("all");

  const usersQuery = useQuery<PaginatedResponse<User>>({
    queryKey: [API_ENDPOINTS.USERS, usersPage, userSearch, userRoleFilter, userStatusFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", String(usersPage));
      params.set("limit", "10");
      if (userSearch) params.set("search", userSearch);
      if (userRoleFilter !== "all") params.set("role", userRoleFilter);
      if (userStatusFilter !== "all") params.set("status", userStatusFilter);

      const res = await apiRequest("GET", `${API_ENDPOINTS.USERS}?${params.toString()}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || "Failed to load users");
      return json.data;
    },
  });

  const postsQuery = useQuery<PaginatedResponse<PostWithAuthor>>({
    queryKey: [API_ENDPOINTS.POSTS, "admin", postsPage],
  });

  const jobsQuery = useQuery<PaginatedResponse<JobWithEmployer>>({
    queryKey: [API_ENDPOINTS.JOBS, "admin", jobsPage],
  });

  const disableUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", API_ENDPOINTS.USER_DISABLE(userId));
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to disable user");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.USERS] });
      setDisablingUser(null);
      toast({ title: "Success", description: "User account disabled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDisablingUser(null);
    },
  });

  const enableUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest("POST", API_ENDPOINTS.USER_ENABLE(userId));
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to enable user");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.USERS] });
      setEnablingUser(null);
      toast({ title: "Success", description: "User account enabled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setEnablingUser(null);
    },
  });

  const deletePostMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", API_ENDPOINTS.POST_BY_ID(id));
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to delete post");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.POSTS] });
      setDeletingPost(null);
      toast({ title: "Success", description: "Post deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingPost(null);
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", API_ENDPOINTS.JOB_BY_ID(id));
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to delete job");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.JOBS] });
      setDeletingJob(null);
      toast({ title: "Success", description: "Job deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setDeletingJob(null);
    },
  });

  const updateUserRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest("POST", API_ENDPOINTS.USER_ROLE(userId), { role });
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to update user role");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.USERS] });
      setPromotingUser(null);
      toast({ title: "Success", description: "User role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setPromotingUser(null);
    },
  });

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return "destructive";
      case UserRole.EMPLOYER:
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Layout>
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-muted-foreground">
            Manage users, posts, and job listings
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="border bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{usersQuery.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card className="border bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{postsQuery.data?.total || 0}</div>
            </CardContent>
          </Card>
          <Card className="border bg-card">
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobsQuery.data?.total || 0}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="users" className="gap-2" data-testid="tab-admin-users">
              <Users className="h-4 w-4" />
              Users
            </TabsTrigger>
            <TabsTrigger value="posts" className="gap-2" data-testid="tab-admin-posts">
              <FileText className="h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger value="jobs" className="gap-2" data-testid="tab-admin-jobs">
              <Briefcase className="h-4 w-4" />
              Jobs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle>All Users</CardTitle>
                <CardDescription>Manage user accounts and permissions</CardDescription>
              </CardHeader>
              <CardContent>
                {}
                <div className="mb-6 space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search users by name, username, or email..."
                      value={userSearch}
                      onChange={(e) => {
                        setUserSearch(e.target.value);
                        setUsersPage(1);
                      }}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-4">
                    <Select value={userRoleFilter} onValueChange={(value) => { setUserRoleFilter(value); setUsersPage(1); }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value={UserRole.DEVELOPER}>Developer</SelectItem>
                        <SelectItem value={UserRole.EMPLOYER}>Employer</SelectItem>
                        <SelectItem value={UserRole.ADMIN}>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={userStatusFilter} onValueChange={(value) => { setUserStatusFilter(value); setUsersPage(1); }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="disabled">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {usersQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : usersQuery.error ? (
                  <p className="text-destructive text-center py-8">Failed to load users</p>
                ) : usersQuery.data?.items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No users found</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Joined</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {usersQuery.data?.items.map((user) => (
                            <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                              <TableCell className="font-medium">
                                <Link href={`/user/${user.id}`}>
                                  <div className="hover:text-primary cursor-pointer transition-colors">
                                    <p>{user.name}</p>
                                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                                  {user.role}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={user.isDisabled ? "destructive" : "outline"} 
                                  size="sm"
                                >
                                  {user.isDisabled ? "Disabled" : "Active"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {user.role !== UserRole.ADMIN && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => setPromotingUser(user)}
                                      data-testid={`button-promote-user-${user.id}`}
                                    >
                                      <Crown className="h-4 w-4 mr-1" />
                                      Make Admin
                                    </Button>
                                  )}
                                  {user.role !== UserRole.ADMIN && (
                                    user.isDisabled ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setEnablingUser(user)}
                                        data-testid={`button-enable-user-${user.id}`}
                                      >
                                        <Check className="h-4 w-4 mr-1" />
                                        Enable
                                      </Button>
                                    ) : (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setDisablingUser(user)}
                                        className="text-destructive hover:text-destructive"
                                        data-testid={`button-disable-user-${user.id}`}
                                      >
                                        <Ban className="h-4 w-4 mr-1" />
                                        Disable
                                      </Button>
                                    )
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {usersQuery.data && usersQuery.data.totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          page={usersPage}
                          totalPages={usersQuery.data.totalPages}
                          onPageChange={setUsersPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="posts">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle>All Posts</CardTitle>
                <CardDescription>Moderate community posts</CardDescription>
              </CardHeader>
              <CardContent>
                {postsQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : postsQuery.error ? (
                  <p className="text-destructive text-center py-8">Failed to load posts</p>
                ) : postsQuery.data?.items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No posts found</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Author</TableHead>
                            <TableHead>Created</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {postsQuery.data?.items.map((post) => (
                            <TableRow key={post.id} data-testid={`row-post-${post.id}`}>
                              <TableCell className="font-medium max-w-xs truncate">
                                {post.title}
                              </TableCell>
                              <TableCell>
                                <Link href={`/user/${post.author.id}`}>
                                  <div className="hover:text-primary cursor-pointer transition-colors">
                                    <p>{post.author.name}</p>
                                    <p className="text-sm text-muted-foreground">@{post.author.username}</p>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingPost(post)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-post-${post.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {postsQuery.data && postsQuery.data.totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          page={postsPage}
                          totalPages={postsQuery.data.totalPages}
                          onPageChange={setPostsPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card className="border bg-card">
              <CardHeader>
                <CardTitle>All Jobs</CardTitle>
                <CardDescription>Moderate job listings</CardDescription>
              </CardHeader>
              <CardContent>
                {jobsQuery.isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : jobsQuery.error ? (
                  <p className="text-destructive text-center py-8">Failed to load jobs</p>
                ) : jobsQuery.data?.items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No jobs found</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Company</TableHead>
                            <TableHead>Posted By</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {jobsQuery.data?.items.map((job) => (
                            <TableRow key={job.id} data-testid={`row-job-${job.id}`}>
                              <TableCell className="font-medium max-w-xs truncate">
                                {job.title}
                              </TableCell>
                              <TableCell>{job.company}</TableCell>
                              <TableCell>
                                <Link href={`/user/${job.employer.id}`}>
                                  <div className="hover:text-primary cursor-pointer transition-colors">
                                    <p>{job.employer.name}</p>
                                    <p className="text-sm text-muted-foreground">@{job.employer.username}</p>
                                  </div>
                                </Link>
                              </TableCell>
                              <TableCell>
                                <Badge variant={job.isActive ? "outline" : "secondary"} size="sm">
                                  {job.isActive ? "Active" : "Closed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setDeletingJob(job)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-job-${job.id}`}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    {jobsQuery.data && jobsQuery.data.totalPages > 1 && (
                      <div className="mt-6">
                        <Pagination
                          page={jobsPage}
                          totalPages={jobsQuery.data.totalPages}
                          onPageChange={setJobsPage}
                        />
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <ConfirmDialog
        open={!!disablingUser}
        onOpenChange={(open) => !open && setDisablingUser(null)}
        title="Disable User Account"
        description={`Are you sure you want to disable ${disablingUser?.name}'s account? They will not be able to log in.`}
        confirmLabel="Disable Account"
        onConfirm={() => disablingUser && disableUserMutation.mutate(disablingUser.id)}
        isLoading={disableUserMutation.isPending}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!enablingUser}
        onOpenChange={(open) => !open && setEnablingUser(null)}
        title="Enable User Account"
        description={`Are you sure you want to enable ${enablingUser?.name}'s account? They will be able to log in again.`}
        confirmLabel="Enable Account"
        onConfirm={() => enablingUser && enableUserMutation.mutate(enablingUser.id)}
        isLoading={enableUserMutation.isPending}
      />

      <ConfirmDialog
        open={!!deletingPost}
        onOpenChange={(open) => !open && setDeletingPost(null)}
        title="Delete Post"
        description="Are you sure you want to delete this post? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingPost && deletePostMutation.mutate(deletingPost.id)}
        isLoading={deletePostMutation.isPending}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!deletingJob}
        onOpenChange={(open) => !open && setDeletingJob(null)}
        title="Delete Job Listing"
        description="Are you sure you want to delete this job listing? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => deletingJob && deleteJobMutation.mutate(deletingJob.id)}
        isLoading={deleteJobMutation.isPending}
        variant="destructive"
      />

      <ConfirmDialog
        open={!!promotingUser}
        onOpenChange={(open) => !open && setPromotingUser(null)}
        title="Promote to Admin"
        description={`Are you sure you want to promote ${promotingUser?.name} to admin? They will have full access to the admin dashboard.`}
        confirmLabel="Promote to Admin"
        onConfirm={() => promotingUser && updateUserRoleMutation.mutate({ userId: promotingUser.id, role: UserRole.ADMIN })}
        isLoading={updateUserRoleMutation.isPending}
      />
    </Layout>
  );
}
