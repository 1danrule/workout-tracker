from django.urls import path

from .views import (
    ExerciseDetailView,
    ExerciseListCreateView,
    WorkoutDetailView,
    WorkoutListCreateView,
    WorkoutSetCreateView,
    WorkoutSetDetailView,
)

urlpatterns = [
    path('exercises/', ExerciseListCreateView.as_view(), name='exercise-list'),
    path('exercises/<int:pk>/', ExerciseDetailView.as_view(), name='exercise-detail'),
    path('workouts/', WorkoutListCreateView.as_view(), name='workout-list'),
    path('workouts/<int:pk>/', WorkoutDetailView.as_view(), name='workout-detail'),
    path('workouts/<int:workout_pk>/sets/', WorkoutSetCreateView.as_view(), name='workoutset-create'),
    path('workouts/<int:workout_pk>/sets/<int:pk>/', WorkoutSetDetailView.as_view(), name='workoutset-detail'),
]
