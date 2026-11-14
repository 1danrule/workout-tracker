from rest_framework import serializers

from .models import Exercise, Workout, WorkoutSet


class ExerciseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exercise
        fields = ('id', 'name', 'description', 'muscle_group')


class WorkoutSetSerializer(serializers.ModelSerializer):
    exercise_name = serializers.CharField(source='exercise.name', read_only=True)

    class Meta:
        model = WorkoutSet
        fields = ('id', 'exercise', 'exercise_name', 'set_number', 'reps', 'weight_kg')


class WorkoutSerializer(serializers.ModelSerializer):
    sets = WorkoutSetSerializer(many=True, read_only=True)

    class Meta:
        model = Workout
        fields = ('id', 'name', 'date', 'notes', 'sets', 'created_at')
        read_only_fields = ('created_at',)
