import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, FileText, X } from "lucide-react";

interface JobApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobTitle: string;
  onSubmit: (data: { skills: string; cv: File | null }) => Promise<void>;
  isSubmitting?: boolean;
}

export function JobApplicationDialog({
  open,
  onOpenChange,
  jobTitle,
  onSubmit,
  isSubmitting,
}: JobApplicationDialogProps) {
  const [skills, setSkills] = useState("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setCvFile(null);
      setCvError("");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.type)) {
      setCvError("Only PDF, DOC, and DOCX files are allowed");
      setCvFile(null);
      return;
    }

    if (file.size > maxSize) {
      setCvError("File size must be less than 5MB");
      setCvFile(null);
      return;
    }

    setCvError("");
    setCvFile(file);
  };

  const handleRemoveFile = () => {
    setCvFile(null);
    setCvError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!skills.trim()) {
      return;
    }

    await onSubmit({ skills: skills.trim(), cv: cvFile });
    
    // Reset form on success (will be handled by parent if submission succeeds)
    if (!isSubmitting) {
      setSkills("");
      setCvFile(null);
      setCvError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isSubmitting) {
      // Reset form when closing
      setSkills("");
      setCvFile(null);
      setCvError("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Apply to {jobTitle}</DialogTitle>
          <DialogDescription>
            Write your skills and upload your CV to apply for this position.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="skills">
              Your Skills <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="skills"
              placeholder="e.g., JavaScript, React, Node.js, TypeScript..."
              value={skills}
              onChange={(e) => setSkills(e.target.value)}
              disabled={isSubmitting}
              rows={4}
              className="resize-none"
              required
            />
            <p className="text-xs text-muted-foreground">
              List your relevant skills for this position
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cv">
              Upload Your CV <span className="text-muted-foreground text-xs">(Optional)</span>
            </Label>
            <div className="space-y-2">
              <Input
                id="cv"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                disabled={isSubmitting}
                className="cursor-pointer"
              />
              {cvFile && (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm truncate">{cvFile.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveFile}
                    disabled={isSubmitting}
                    className="h-6 w-6 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
              {cvError && (
                <p className="text-xs text-destructive">{cvError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                PDF, DOC, or DOCX files only. Maximum size: 5MB
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !skills.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Apply
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

