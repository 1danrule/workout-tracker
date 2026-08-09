from django.conf import settings
from django.db import models


class Profile(models.Model):
    """
    Extra info about the user: physical stats and training goal.
    Linked one-to-one to Django's built-in User model, so we don't
    need a custom user model.
    """

    class Goal(models.TextChoices):
        BULK = 'bulk', 'Muscle gain'
        CUT = 'cut', 'Cutting'
        MAINTAIN = 'maintain', 'Maintain'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    goal = models.CharField(max_length=20, choices=Goal.choices, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile of {self.user.username}'
