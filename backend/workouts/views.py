from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions

from .models import Exercise, Workout, WorkoutSet
from .serializers import (
    ExerciseSerializer,
    WorkoutSerializer,
    WorkoutSetSerializer,
)


class ExerciseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/exercises/  - anyone logged in can browse the library
    POST /api/exercises/  - only staff/admin can add new exercises
    (keeps the shared library clean - regular users can't spam it)
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


class ExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/exercises/<id>/ - view a single exercise
    PATCH  /api/exercises/<id>/ - edit it (admin only)
    DELETE /api/exercises/<id>/ - remove it (admin only)
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]


class WorkoutListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/workouts/?date=YYYY-MM-DD  - list user's workouts (optionally filtered by date)
    POST /api/workouts/                  - create a new workout
    """
    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Workout.objects.filter(user=self.request.user).prefetch_related(
            'sets', 'sets__exercise'
        )
        date = self.request.query_params.get('date')
        if date:
            queryset = queryset.filter(date=date)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class WorkoutDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/workouts/<id>/ - view a single workout with its sets
    PATCH  /api/workouts/<id>/ - update workout details
    DELETE /api/workouts/<id>/ - delete workout
    """
    serializer_class = WorkoutSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workout.objects.filter(user=self.request.user).prefetch_related(
            'sets', 'sets__exercise'
        )


class WorkoutSetCreateView(generics.CreateAPIView):
    """
    POST /api/workouts/<workout_pk>/sets/ - add a set to a workout
    """
    serializer_class = WorkoutSetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return WorkoutSet.objects.filter(workout__user=self.request.user)

    def perform_create(self, serializer):
        workout = get_object_or_404(
            Workout,
            pk=self.kwargs.get('workout_pk'),
            user=self.request.user,
        )
        serializer.save(workout=workout)


class WorkoutSetDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/workouts/<workout_pk>/sets/<id>/ - view a single set
    PATCH  /api/workouts/<workout_pk>/sets/<id>/ - update a set
    DELETE /api/workouts/<workout_pk>/sets/<id>/ - delete a set
    """
    serializer_class = WorkoutSetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = WorkoutSet.objects.filter(workout__user=self.request.user)
        if 'workout_pk' in self.kwargs:
            queryset = queryset.filter(workout_id=self.kwargs['workout_pk'])
        return queryset
