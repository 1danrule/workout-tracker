from django.core.management.base import BaseCommand

from workouts.models import Exercise

EXERCISES = [
    # (name, muscle_group, description)
    ('Bench Press', Exercise.MuscleGroup.CHEST, 'Barbell press lying on a flat bench.'),
    ('Incline Dumbbell Press', Exercise.MuscleGroup.CHEST, 'Dumbbell press on an inclined bench.'),
    ('Push-Up', Exercise.MuscleGroup.CHEST, 'Bodyweight press from the floor.'),
    ('Deadlift', Exercise.MuscleGroup.BACK, 'Barbell lift from the floor to hip level.'),
    ('Pull-Up', Exercise.MuscleGroup.BACK, 'Bodyweight pull on a bar.'),
    ('Barbell Row', Exercise.MuscleGroup.BACK, 'Bent-over row with a barbell.'),
    ('Lat Pulldown', Exercise.MuscleGroup.BACK, 'Cable pulldown targeting the lats.'),
    ('Squat', Exercise.MuscleGroup.LEGS, 'Barbell squat on the shoulders.'),
    ('Leg Press', Exercise.MuscleGroup.LEGS, 'Machine press with the legs.'),
    ('Romanian Deadlift', Exercise.MuscleGroup.LEGS, 'Hip-hinge movement targeting hamstrings.'),
    ('Lunges', Exercise.MuscleGroup.LEGS, 'Alternating stepping squat.'),
    ('Overhead Press', Exercise.MuscleGroup.SHOULDERS, 'Barbell press above the head.'),
    ('Lateral Raise', Exercise.MuscleGroup.SHOULDERS, 'Dumbbell raise to the sides.'),
    ('Barbell Curl', Exercise.MuscleGroup.ARMS, 'Bicep curl with a barbell.'),
    ('Triceps Pushdown', Exercise.MuscleGroup.ARMS, 'Cable pushdown for triceps.'),
    ('Plank', Exercise.MuscleGroup.CORE, 'Isometric core hold.'),
    ('Hanging Leg Raise', Exercise.MuscleGroup.CORE, 'Leg raise hanging from a bar.'),
    ('Burpee', Exercise.MuscleGroup.FULL_BODY, 'Full-body conditioning movement.'),
]


class Command(BaseCommand):
    help = 'Seed the database with a starter set of exercises.'

    def handle(self, *args, **options):
        created_count = 0
        for name, muscle_group, description in EXERCISES:
            _, created = Exercise.objects.get_or_create(
                name=name,
                defaults={
                    'muscle_group': muscle_group,
                    'description': description,
                },
            )
            if created:
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Done. Created {created_count} new exercises '
                f'({len(EXERCISES) - created_count} already existed).'
            )
        )
