from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobViewSet, JobApplicationViewSet

router = DefaultRouter()
router.register("jobs", JobViewSet, basename="jobs")
router.register("applications", JobApplicationViewSet, basename="applications")

urlpatterns = [
    path("", include(router.urls)),
]
