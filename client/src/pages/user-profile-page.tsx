import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { API_ENDPOINTS } from "@/lib/api-config";
import { getQueryFn } from "@/lib/queryClient";
import { User, UserRole } from "@shared/schema";
import { MapPin, Globe, Code2, Briefcase, Shield, User as UserIcon, FileText, Download, MessageSquare } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function UserProfilePage() {
  const [match, params] = useRoute("/user/:id");
  const { user: currentUser } = useAuth();
  const userId = params?.id;

  const { data: profileUser, isLoading, error } = useQuery<User>({
    queryKey: [API_ENDPOINTS.USER_BY_ID(userId || "")],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!userId,
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Shield className="h-4 w-4" />;
      case UserRole.EMPLOYER:
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Code2 className="h-4 w-4" />;
    }
  };

  const skills = profileUser?.skills
    ? profileUser.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  const isOwnProfile = currentUser?.id === profileUser?.id;

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Card className="border bg-card">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-8 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (error || !profileUser) {
    return (
      <Layout>
        <div className="container mx-auto max-w-4xl px-4 py-8">
          <Card className="border bg-card">
            <CardContent className="py-16 text-center">
              <UserIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
              <p className="text-muted-foreground mb-4">The user you're looking for doesn't exist.</p>
              <Link href="/feed">
                <Button variant="outline">Go to Feed</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <Card className="border bg-card">
          <CardHeader className="text-center border-b pb-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-24 w-24">
                {profileUser.avatarUrl && (
                  <AvatarImage 
                    src={API_ENDPOINTS.AVATAR_DOWNLOAD(profileUser.avatarUrl.split("/").pop() || "")} 
                    alt={profileUser.name}
                  />
                )}
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {getInitials(profileUser.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-2xl mb-2">{profileUser.name}</CardTitle>
                <CardDescription className="flex items-center justify-center gap-2">
                  @{profileUser.username}
                  <Badge variant={getRoleBadgeVariant(profileUser.role)} size="sm" className="gap-1">
                    {getRoleIcon(profileUser.role)}
                    {profileUser.role}
                  </Badge>
                </CardDescription>
                {profileUser.isDisabled && (
                  <Badge variant="destructive" size="sm" className="mt-2">
                    Account Disabled
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                {isOwnProfile ? (
                  <Link href="/profile">
                    <Button variant="outline" size="sm">
                      Edit Profile
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/messages/${profileUser.id}`}>
                    <Button variant="default" size="sm" className="gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Send Message
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            {profileUser.bio && (
              <div>
                <h3 className="text-sm font-medium mb-2">About</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{profileUser.bio}</p>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profileUser.location && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{profileUser.location}</span>
                </div>
              )}
              {profileUser.website && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <a
                    href={profileUser.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary"
                  >
                    {profileUser.website}
                  </a>
                </div>
              )}
              {profileUser.company && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="h-4 w-4" />
                  <span>{profileUser.company}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserIcon className="h-4 w-4" />
                <span>Joined {formatDistanceToNow(new Date(profileUser.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            {skills.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-2">Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="secondary" size="sm">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {profileUser.cvUrl && (
              <div>
                <h3 className="text-sm font-medium mb-2">Resume / CV</h3>
                <div className="flex items-center gap-3 p-4 border rounded-md bg-muted/50">
                  <FileText className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">CV Available</p>
                    <p className="text-xs text-muted-foreground">Click to download</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(API_ENDPOINTS.CV_DOWNLOAD(profileUser.cvUrl!.split("/").pop() || ""), "_blank")}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

