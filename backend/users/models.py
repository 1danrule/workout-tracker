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

    class Sex(models.TextChoices):
        MALE = 'male', 'Male'
        FEMALE = 'female', 'Female'

    class ActivityLevel(models.TextChoices):
        SEDENTARY = 'sedentary', 'Sedentary (little or no exercise)'
        LIGHT = 'light', 'Light (1-3 workouts a week)'
        MODERATE = 'moderate', 'Moderate (3-5 workouts a week)'
        HIGH = 'high', 'High (6-7 workouts a week)'
        VERY_HIGH = 'very_high', 'Very high (physical job or two a day)'

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='profile',
    )
    weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    height_cm = models.PositiveSmallIntegerField(null=True, blank=True)
    age = models.PositiveSmallIntegerField(null=True, blank=True)
    goal = models.CharField(max_length=20, choices=Goal.choices, blank=True)
    sex = models.CharField(max_length=10, choices=Sex.choices, blank=True)
    activity_level = models.CharField(
        max_length=20, choices=ActivityLevel.choices, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'Profile of {self.user.username}'
