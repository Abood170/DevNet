import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { API_ENDPOINTS } from "@/lib/api-config";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { UserRole } from "@shared/schema";
import { Loader2, User, Upload, FileText, Download, Trash2, Image as ImageIcon } from "lucide-react";
import { useRef, useState } from "react";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  bio: z.string().optional(),
  skills: z.string().optional(),
  company: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingCV, setIsUploadingCV] = useState(false);
  const [isDeletingCV, setIsDeletingCV] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isDeletingAvatar, setIsDeletingAvatar] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      bio: user?.bio || "",
      skills: user?.skills || "",
      company: user?.company || "",
      location: user?.location || "",
      website: user?.website || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("PATCH", API_ENDPOINTS.PROFILE, data);
      const result = await res.json();
      if (!result.success) throw new Error(result.error?.message || "Failed to update profile");
      return result.data;
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData([API_ENDPOINTS.USER], updatedUser);
      toast({ title: "Success", description: "Profile updated successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateMutation.mutate(data);
  };

  const handleCVUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF, DOC, or DOCX file",
        variant: "destructive",
      });
      return;
    }

    
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingCV(true);
    const formData = new FormData();
    formData.append("cv", file);

    try {
      const res = await fetch(API_ENDPOINTS.PROFILE_CV_UPLOAD, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to upload CV");
      }

      queryClient.setQueryData([API_ENDPOINTS.USER], result.data);
      toast({
        title: "Success",
        description: "CV uploaded successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload CV",
        variant: "destructive",
      });
    } finally {
      setIsUploadingCV(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleCVDelete = async () => {
    if (!confirm("Are you sure you want to delete your CV?")) return;

    setIsDeletingCV(true);
    try {
      const res = await apiRequest("DELETE", API_ENDPOINTS.PROFILE_CV_DELETE);
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to delete CV");
      }

      queryClient.setQueryData([API_ENDPOINTS.USER], (old: any) => ({
        ...old,
        cvUrl: null,
      }));
      toast({
        title: "Success",
        description: "CV deleted successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete CV",
        variant: "destructive",
      });
    } finally {
      setIsDeletingCV(false);
    }
  };

  const getCVFilename = (cvUrl: string | null | undefined) => {
    if (!cvUrl) return "";
    const parts = cvUrl.split("/");
    return parts[parts.length - 1];
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (JPEG, PNG, WebP, or GIF)",
        variant: "destructive",
      });
      return;
    }

    
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "File size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingAvatar(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch(API_ENDPOINTS.PROFILE_AVATAR_UPLOAD, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to upload avatar");
      }

      queryClient.setQueryData([API_ENDPOINTS.USER], result.data);
      toast({
        title: "Success",
        description: "Profile picture updated successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar",
        variant: "destructive",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleAvatarDelete = async () => {
    if (!confirm("Are you sure you want to remove your profile picture?")) return;

    setIsDeletingAvatar(true);
    try {
      const res = await apiRequest("DELETE", API_ENDPOINTS.PROFILE_AVATAR_DELETE);
      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error?.message || "Failed to delete avatar");
      }

      queryClient.setQueryData([API_ENDPOINTS.USER], (old: any) => ({
        ...old,
        avatarUrl: null,
      }));
      toast({
        title: "Success",
        description: "Profile picture removed successfully!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete avatar",
        variant: "destructive",
      });
    } finally {
      setIsDeletingAvatar(false);
    }
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

  return (
    <Layout>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your personal information and preferences
          </p>
        </div>

        <Card className="border bg-card">
          <CardHeader className="text-center border-b pb-6">
            <div className="relative inline-block mb-4">
              <Avatar className="h-24 w-24 mx-auto">
                {user?.avatarUrl && (
                  <AvatarImage 
                    src={API_ENDPOINTS.AVATAR_DOWNLOAD(user.avatarUrl.split("/").pop() || "")} 
                    alt={user.name}
                  />
                )}
                <AvatarFallback className="text-3xl bg-primary/10 text-primary">
                  {user ? getInitials(user.name) : <User className="h-10 w-10" />}
                </AvatarFallback>
              </Avatar>
              <div className="absolute bottom-0 right-0">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                  className="hidden"
                  id="avatar-upload"
                />
                <label
                  htmlFor="avatar-upload"
                  className={`flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors ${
                    isUploadingAvatar ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  title={user?.avatarUrl ? "Change picture" : "Upload picture"}
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </label>
              </div>
              {user?.avatarUrl && (
                <button
                  onClick={handleAvatarDelete}
                  disabled={isDeletingAvatar}
                  className="absolute top-0 right-0 flex items-center justify-center w-6 h-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                  title="Remove picture"
                >
                  {isDeletingAvatar ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </button>
              )}
            </div>
            <CardTitle>{user?.name}</CardTitle>
            <CardDescription className="flex items-center justify-center gap-2">
              @{user?.username}
              <Badge variant={getRoleBadgeVariant(user?.role || "")} size="sm">
                {user?.role}
              </Badge>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  {...form.register("name")}
                  data-testid="input-profile-name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself..."
                  className="min-h-24 resize-none"
                  {...form.register("bio")}
                  data-testid="input-profile-bio"
                />
              </div>

              {user?.role === UserRole.DEVELOPER && (
                <div className="space-y-2">
                  <Label htmlFor="skills">Skills (comma separated)</Label>
                  <Input
                    id="skills"
                    placeholder="JavaScript, React, Node.js, Python"
                    {...form.register("skills")}
                    data-testid="input-profile-skills"
                  />
                  <p className="text-xs text-muted-foreground">
                    List your technical skills separated by commas
                  </p>
                </div>
              )}

              {user?.role === UserRole.EMPLOYER && (
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Acme Inc."
                    {...form.register("company")}
                    data-testid="input-profile-company"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  placeholder="Amman, JO"
                  {...form.register("location")}
                  data-testid="input-profile-location"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  placeholder="https://yourwebsite.com"
                  {...form.register("website")}
                  data-testid="input-profile-website"
                />
                {form.formState.errors.website && (
                  <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
                )}
              </div>

              <div className="space-y-2 border-t pt-6">
                <Label>Resume / CV</Label>
                {user?.cvUrl ? (
                  <div className="flex items-center gap-3 p-4 border rounded-md bg-muted/50">
                    <FileText className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{getCVFilename(user.cvUrl)}</p>
                      <p className="text-xs text-muted-foreground">CV uploaded</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(API_ENDPOINTS.CV_DOWNLOAD(getCVFilename(user.cvUrl)), "_blank")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCVDelete}
                        disabled={isDeletingCV}
                      >
                        {isDeletingCV ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Input
                        ref={fileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx"
                        onChange={handleCVUpload}
                        disabled={isUploadingCV}
                        className="hidden"
                        id="cv-upload"
                      />
                      <Label
                        htmlFor="cv-upload"
                        className="flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUploadingCV ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            Upload CV
                          </>
                        )}
                      </Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload your resume (PDF, DOC, or DOCX). Maximum file size: 5MB
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={updateMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
