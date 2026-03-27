from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    class Role(models.TextChoices):
        DEVELOPER = "developer", "Developer"
        EMPLOYER  = "employer",  "Employer"
        ADMIN     = "admin",     "Admin"

    role = models.CharField(max_length=20, choices=Role.choices, default=Role.DEVELOPER)
    is_disabled = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.username} ({self.role})"
