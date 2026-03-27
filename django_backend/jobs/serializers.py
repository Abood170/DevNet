from rest_framework import serializers
from .models import Job, JobApplication

class JobSerializer(serializers.ModelSerializer):
    employer_username = serializers.CharField(source="employer.username", read_only=True)
    applications_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Job
        fields = (
            "id",
            "employer",
            "employer_username",
            "title",
            "company",
            "location",
            "description",
            "is_accessible",
            "accommodations",
            "created_at",
            "updated_at",
            "applications_count",
        )
        read_only_fields = ("id", "employer", "created_at", "updated_at", "applications_count")

class JobApplicationSerializer(serializers.ModelSerializer):
    applicant_username = serializers.CharField(source="applicant.username", read_only=True)

    class Meta:
        model = JobApplication
        fields = ("id", "job", "applicant", "applicant_username", "cover_letter", "created_at")
        read_only_fields = ("id", "job", "applicant", "created_at")
