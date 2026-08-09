from django.conf import settings
from django.db import models


class Exercise(models.Model):
    """
    A single exercise from the library, e.g. 'Bench Press'.
    These are shared across all users (not tied to a specific user).
    """

    class MuscleGroup(models.TextChoices):
        CHEST = 'chest', 'Chest'
        BACK = 'back', 'Back'
        LEGS = 'legs', 'Legs'
        SHOULDERS = 'shoulders', 'Shoulders'
        ARMS = 'arms', 'Arms'
        CORE = 'core', 'Core'
        FULL_BODY = 'full_body', 'Full body'

    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    muscle_group = models.CharField(max_length=20, choices=MuscleGroup.choices)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Workout(models.Model):
    """
    A single training session, e.g. 'Push day - 09.08.2026'.
    """

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='workouts',
    )
    name = models.CharField(max_length=100, blank=True)
    date = models.DateField()
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f'{self.name or "Workout"} — {self.user.username} — {self.date}'


class WorkoutSet(models.Model):
    """
    A single set within a workout: one exercise, one set number,
    with the reps and weight used.
    """

    workout = models.ForeignKey(
        Workout,
        on_delete=models.CASCADE,
        related_name='sets',
    )
    exercise = models.ForeignKey(
        Exercise,
        on_delete=models.PROTECT,
        related_name='sets',
    )
    set_number = models.PositiveSmallIntegerField()
    reps = models.PositiveSmallIntegerField()
    weight_kg = models.DecimalField(max_digits=6, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['workout', 'exercise', 'set_number']

    def __str__(self):
        return f'{self.exercise.name} #{self.set_number} — {self.reps}x{self.weight_kg}kg'
