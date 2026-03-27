from rest_framework import serializers
from .models import Post, Comment, Like

class CommentSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)

    class Meta:
        model = Comment
        fields = ("id", "post", "author", "author_username", "content", "created_at")
        read_only_fields = ("id", "author", "created_at", "post")

class PostSerializer(serializers.ModelSerializer):
    author_username = serializers.CharField(source="author.username", read_only=True)
    comments_count = serializers.IntegerField(read_only=True)
    likes_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Post
        fields = ("id", "author", "author_username", "content", "created_at", "updated_at", "comments_count", "likes_count")
        read_only_fields = ("id", "author", "created_at", "updated_at", "comments_count", "likes_count")
