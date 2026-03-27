import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertJobSchema, Job } from "@shared/schema";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";

type JobFormData = z.infer<typeof insertJobSchema>;

interface JobFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
  onSubmit: (data: JobFormData) => void;
  isSubmitting?: boolean;
}

export function JobFormDialog({
  open,
  onOpenChange,
  job,
  onSubmit,
  isSubmitting,
}: JobFormDialogProps) {
  const isEditing = !!job;

  const form = useForm<JobFormData>({
    resolver: zodResolver(insertJobSchema),
    defaultValues: {
      title: "",
      description: "",
      company: "",
      location: "",
      jobType: "full-time",
      salaryMin: undefined,
      salaryMax: undefined,
      skills: "",
      deadline: undefined,
      isAccessible: false,
      accommodations: "",
    },
  });

  const isAccessible = form.watch("isAccessible");

  useEffect(() => {
    if (job) {
      form.reset({
        title: job.title,
        description: job.description,
        company: job.company,
        location: job.location,
        jobType: job.jobType as any,
        salaryMin: job.salaryMin ?? undefined,
        salaryMax: job.salaryMax ?? undefined,
        skills: job.skills || "",
        deadline: job.deadline ? new Date(job.deadline).toISOString().slice(0, 16) : undefined,
        isAccessible: job.isAccessible ?? false,
        accommodations: job.accommodations || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
        company: "",
        location: "",
        jobType: "full-time",
        salaryMin: undefined,
        salaryMax: undefined,
        skills: "",
        deadline: undefined,
        isAccessible: false,
        accommodations: "",
      });
    }
  }, [job, form]);

  const handleSubmit = (data: JobFormData) => {
    
    const payload: JobFormData = {
      ...data,
      accommodations: data.isAccessible ? (data.accommodations ?? "") : "",
      deadline: data.deadline && data.deadline.trim() ? data.deadline : null,
    };

    onSubmit(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Job Listing" : "Post a New Job"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your job listing details."
              : "Fill in the details to post a new job opportunity."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="job-title">Job Title</Label>
              <Input
                id="job-title"
                placeholder="Senior Frontend Developer"
                {...form.register("title")}
                data-testid="input-job-title"
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-company">Company</Label>
                <Input
                  id="job-company"
                  placeholder="Acme Inc."
                  {...form.register("company")}
                  data-testid="input-job-company"
                />
                {form.formState.errors.company && (
                  <p className="text-sm text-destructive">{form.formState.errors.company.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-location">Location</Label>
                <Input
                  id="job-location"
                  placeholder="Amman, Jordan"
                  {...form.register("location")}
                  data-testid="input-job-location"
                />
                {form.formState.errors.location && (
                  <p className="text-sm text-destructive">{form.formState.errors.location.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-type">Job Type</Label>
              <Select
                value={form.watch("jobType")}
                onValueChange={(value) => form.setValue("jobType", value as any)}
              >
                <SelectTrigger data-testid="select-job-type">
                  <SelectValue placeholder="Select job type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-salary-min">Min Salary (USD)</Label>
                <Input
                  id="job-salary-min"
                  type="number"
                  placeholder="80000"
                  min="0"
                  {...form.register("salaryMin", { valueAsNumber: true })}
                  data-testid="input-job-salary-min"
                />
                {form.formState.errors.salaryMin && (
                  <p className="text-sm text-destructive">{form.formState.errors.salaryMin.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="job-salary-max">Max Salary (USD)</Label>
                <Input
                  id="job-salary-max"
                  type="number"
                  placeholder="120000"
                  min="0"
                  {...form.register("salaryMax", { valueAsNumber: true })}
                  data-testid="input-job-salary-max"
                />
                {form.formState.errors.salaryMax && (
                  <p className="text-sm text-destructive">{form.formState.errors.salaryMax.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-description">Description</Label>
              <Textarea
                id="job-description"
                placeholder="Describe the role, responsibilities, and requirements..."
                className="min-h-32 resize-none"
                {...form.register("description")}
                data-testid="input-job-description"
              />
              {form.formState.errors.description && (
                <p className="text-sm text-destructive">{form.formState.errors.description.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-skills">Required Skills (comma separated)</Label>
              <Input
                id="job-skills"
                placeholder="React, TypeScript, Node.js"
                {...form.register("skills")}
                data-testid="input-job-skills"
              />
              <p className="text-xs text-muted-foreground">
                Separate multiple skills with commas
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="job-deadline">Application Deadline (Optional)</Label>
              <Input
                id="job-deadline"
                type="datetime-local"
                {...form.register("deadline")}
                data-testid="input-job-deadline"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty for no deadline
              </p>
            </div>

            {}
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={!!isAccessible}
                  onCheckedChange={(v) => {
                    const next = v === true;
                    form.setValue("isAccessible", next, { shouldDirty: true, shouldValidate: true });
                    if (!next) form.setValue("accommodations", "", { shouldDirty: true });
                  }}
                  id="job-accessible"
                  data-testid="checkbox-job-accessible"
                />
                <div className="space-y-1">
                  <Label htmlFor="job-accessible" className="cursor-pointer">
                    Disability-friendly / مناسبة لذوي الاحتياجات الخاصة
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    فعّل هذا الخيار إذا كانت الوظيفة تدعم ترتيبات/تسهيلات لذوي الإعاقة (مثل: إمكانية الوصول، ساعات مرنة، أدوات مساعدة…).
                  </p>
                </div>
              </div>

              {isAccessible && (
                <div className="space-y-2">
                  <Label htmlFor="job-accommodations">Accommodations / التسهيلات</Label>
                  <Textarea
                    id="job-accommodations"
                    placeholder="مثال: مكتب قابل للوصول، ساعات مرنة، قارئ شاشة، مترجم لغة إشارة..."
                    className="min-h-24 resize-none"
                    {...form.register("accommodations")}
                    data-testid="input-job-accommodations"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-job-cancel"
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isSubmitting} data-testid="button-job-submit">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Saving..." : "Posting..."}
                </>
              ) : (
                isEditing ? "Save Changes" : "Post Job"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
