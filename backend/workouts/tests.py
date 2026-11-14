from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from workouts.models import Exercise, Workout, WorkoutSet


class WorkoutAPITests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', password='password123')
        self.user2 = User.objects.create_user(username='user2', password='password123')
        
        self.exercise = Exercise.objects.create(
            name='Bench Press',
            muscle_group=Exercise.MuscleGroup.CHEST,
            description='Chest exercise'
        )

        self.client.force_authenticate(user=self.user1)

    def test_create_and_list_workout(self):
        # Create workout
        url = reverse('workout-list')
        data = {
            'name': 'Push Day',
            'date': '2026-10-30',
            'notes': 'Good session',
        }
        resp = self.client.post(url, data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['name'], 'Push Day')
        self.assertEqual(resp.data['date'], '2026-10-30')
        self.assertEqual(resp.data['sets'], [])

        # List workouts
        resp = self.client.get(url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(resp.data), 1)

        # Date filtering
        resp_filtered = self.client.get(url, {'date': '2026-10-30'})
        self.assertEqual(len(resp_filtered.data), 1)
        resp_other_date = self.client.get(url, {'date': '2026-10-29'})
        self.assertEqual(len(resp_other_date.data), 0)

    def test_workout_isolation_between_users(self):
        workout_user2 = Workout.objects.create(
            user=self.user2,
            name='User2 Workout',
            date='2026-10-30',
        )

        # User1 lists workouts - should not see user2's workout
        url = reverse('workout-list')
        resp = self.client.get(url)
        self.assertEqual(len(resp.data), 0)

        # User1 attempts to access user2's workout detail
        detail_url = reverse('workout-detail', kwargs={'pk': workout_user2.pk})
        resp = self.client.get(detail_url)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_workout_detail_update_and_delete(self):
        workout = Workout.objects.create(
            user=self.user1,
            name='Leg Day',
            date='2026-10-30',
        )
        url = reverse('workout-detail', kwargs={'pk': workout.pk})
        
        # Patch workout
        resp = self.client.patch(url, {'notes': 'Heavy squats'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['notes'], 'Heavy squats')

        # Delete workout
        resp = self.client.delete(url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Workout.objects.filter(pk=workout.pk).exists())

    def test_workout_set_create_and_detail(self):
        workout = Workout.objects.create(
            user=self.user1,
            name='Chest Day',
            date='2026-10-30',
        )

        create_set_url = reverse('workoutset-create', kwargs={'workout_pk': workout.pk})
        set_data = {
            'exercise': self.exercise.pk,
            'set_number': 1,
            'reps': 10,
            'weight_kg': '80.00',
        }
        resp = self.client.post(create_set_url, set_data)
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['exercise_name'], 'Bench Press')
        self.assertEqual(resp.data['set_number'], 1)
        self.assertEqual(resp.data['reps'], 10)
        self.assertEqual(resp.data['weight_kg'], '80.00')

        set_id = resp.data['id']

        # Workout detail now includes the set
        workout_detail_url = reverse('workout-detail', kwargs={'pk': workout.pk})
        resp = self.client.get(workout_detail_url)
        self.assertEqual(len(resp.data['sets']), 1)
        self.assertEqual(resp.data['sets'][0]['id'], set_id)

        # Set detail
        set_detail_url = reverse('workoutset-detail', kwargs={'workout_pk': workout.pk, 'pk': set_id})
        resp = self.client.get(set_detail_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['reps'], 10)

        # Update set
        resp = self.client.patch(set_detail_url, {'reps': 12})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['reps'], 12)

        # Delete set
        resp = self.client.delete(set_detail_url)
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(WorkoutSet.objects.filter(pk=set_id).exists())

    def test_cannot_add_set_to_other_users_workout(self):
        workout_user2 = Workout.objects.create(
            user=self.user2,
            name='User2 Workout',
            date='2026-10-30',
        )
        create_set_url = reverse('workoutset-create', kwargs={'workout_pk': workout_user2.pk})
        set_data = {
            'exercise': self.exercise.pk,
            'set_number': 1,
            'reps': 8,
            'weight_kg': '100.00',
        }
        resp = self.client.post(create_set_url, set_data)
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)
