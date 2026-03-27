from django.db.models import Count
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import IsNotDisabled, IsDeveloperOrAdmin
from .models import Post, Comment, Like
from .serializers import PostSerializer, CommentSerializer

class PostViewSet(viewsets.ModelViewSet):
    serializer_class = PostSerializer

    def get_queryset(self):
        return (
            Post.objects.all()
            .select_related("author")
            .annotate(comments_count=Count("comments", distinct=True), likes_count=Count("likes", distinct=True))
            .order_by("-created_at")
        )

    def get_permissions(self):

        base = [permissions.IsAuthenticated, IsNotDisabled]

        if self.action in ("list", "retrieve"):
            return [p() for p in base]

        return [p() for p in base + [IsDeveloperOrAdmin]]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def perform_update(self, serializer):
        post = self.get_object()

        if getattr(self.request.user, "role", "") != "admin" and post.author_id != self.request.user.id:
            raise permissions.PermissionDenied("You can only edit your own posts.")
        serializer.save()

    def perform_destroy(self, instance):

        if getattr(self.request.user, "role", "") != "admin" and instance.author_id != self.request.user.id:
            raise permissions.PermissionDenied("You can only delete your own posts.")
        instance.delete()

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsNotDisabled])
    def comment(self, request, pk=None):
        post = self.get_object()
        serializer = CommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Comment.objects.create(post=post, author=request.user, content=serializer.validated_data["content"])
        return Response({"detail": "Comment added."}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsNotDisabled])
    def like(self, request, pk=None):
        post = self.get_object()
        Like.objects.get_or_create(post=post, user=request.user)
        return Response({"detail": "Liked."}, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"], permission_classes=[permissions.IsAuthenticated, IsNotDisabled])
    def unlike(self, request, pk=None):
        post = self.get_object()
        Like.objects.filter(post=post, user=request.user).delete()
        return Response({"detail": "Unliked."}, status=status.HTTP_200_OK)
