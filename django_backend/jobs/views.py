from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsNotDisabled, IsEmployerOrAdmin
from .models import Job, JobApplication
from .serializers import JobSerializer, JobApplicationSerializer

class JobViewSet(viewsets.ModelViewSet):
    serializer_class = JobSerializer

    def get_queryset(self):
        qs = (
            Job.objects.all()
            .select_related("employer")
            .annotate(applications_count=Count("applications", distinct=True))
            .order_by("-created_at")
        )

        is_accessible = self.request.query_params.get("is_accessible")
        if is_accessible in ("true", "false"):
            qs = qs.filter(is_accessible=(is_accessible == "true"))

        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(title__icontains=q) | qs.filter(company__icontains=q) | qs.filter(description__icontains=q)

        return qs

    def get_permissions(self):
        base = [permissions.IsAuthenticated, IsNotDisabled]

        if self.action in ("list", "retrieve"):
            return [p() for p in base]

        if self.action in ("create", "update", "partial_update", "destroy"):
            return [p() for p in base + [IsEmployerOrAdmin]]

        return [p() for p in base]

    def perform_create(self, serializer):
        serializer.save(employer=self.request.user)

    def perform_update(self, serializer):
        job = self.get_object()

        if getattr(self.request.user, "role", "") != "admin" and job.employer_id != self.request.user.id:
            raise permissions.PermissionDenied("You can only edit your own jobs.")
        serializer.save()

    def perform_destroy(self, instance):
        if getattr(self.request.user, "role", "") != "admin" and instance.employer_id != self.request.user.id:
            raise permissions.PermissionDenied("You can only delete your own jobs.")
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsNotDisabled])
    def apply(self, request, pk=None):
        job = self.get_object()

        cover_letter = request.data.get("cover_letter", "")

        obj, created = JobApplication.objects.get_or_create(
            job=job,
            applicant=request.user,
            defaults={"cover_letter": cover_letter},
        )
        if not created:
            return Response({"detail": "You already applied to this job."}, status=status.HTTP_400_BAD_REQUEST)

        return Response({"detail": "Application submitted."}, status=status.HTTP_201_CREATED)

class JobApplicationViewSet(viewsets.ReadOnlyModelViewSet):
    
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated, IsNotDisabled]

    def get_queryset(self):
        user = self.request.user
        role = getattr(user, "role", "")

        if role == "admin":
            return JobApplication.objects.all().select_related("job", "applicant").order_by("-created_at")

        if role == "employer":
            return JobApplication.objects.filter(job__employer=user).select_related("job", "applicant").order_by("-created_at")

        return JobApplication.objects.filter(applicant=user).select_related("job", "applicant").order_by("-created_at")
