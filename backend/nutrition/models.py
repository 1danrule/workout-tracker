from decimal import Decimal

from django.conf import settings
from django.db import models


class Food(models.Model):
    """
    A food product with its nutrition values per 100 g.

    owner is NULL for shared products (for example ones imported from
    Open Food Facts) and set for a user's own custom products, which
    only that user should see.
    """

    class Source(models.TextChoices):
        MANUAL = 'manual', 'Added manually'
        OPEN_FOOD_FACTS = 'open_food_facts', 'Open Food Facts'

    name = models.CharField(max_length=200)
    brand = models.CharField(max_length=100, blank=True)
    barcode = models.CharField(max_length=32, blank=True, db_index=True)

    calories_per_100g = models.DecimalField(max_digits=7, decimal_places=2)
    protein_per_100g = models.DecimalField(max_digits=6, decimal_places=2)
    fat_per_100g = models.DecimalField(max_digits=6, decimal_places=2)
    carbs_per_100g = models.DecimalField(max_digits=6, decimal_places=2)

    source = models.CharField(
        max_length=20, choices=Source.choices, default=Source.MANUAL
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='custom_foods',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return f'{self.name} ({self.brand})' if self.brand else self.name


class FoodEntry(models.Model):
    """
    One line in a user's food diary: they ate X grams of some food
    on a given day, as part of a given meal.
    """

    class Meal(models.TextChoices):
        BREAKFAST = 'breakfast', 'Breakfast'
        LUNCH = 'lunch', 'Lunch'
        DINNER = 'dinner', 'Dinner'
        SNACK = 'snack', 'Snack'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='food_entries',
    )
    # PROTECT: a food that is used in someone's diary can't be deleted,
    # otherwise their history would silently lose data.
    food = models.ForeignKey(
        Food,
        on_delete=models.PROTECT,
        related_name='entries',
    )
    grams = models.DecimalField(max_digits=7, decimal_places=2)
    date = models.DateField()
    meal = models.CharField(max_length=20, choices=Meal.choices)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date', 'meal', 'created_at']
        verbose_name_plural = 'food entries'

    def _scaled(self, per_100g):
        return (per_100g * self.grams / Decimal('100')).quantize(Decimal('0.1'))

    @property
    def calories(self):
        return self._scaled(self.food.calories_per_100g)

    @property
    def protein(self):
        return self._scaled(self.food.protein_per_100g)

    @property
    def fat(self):
        return self._scaled(self.food.fat_per_100g)

    @property
    def carbs(self):
        return self._scaled(self.food.carbs_per_100g)

    def __str__(self):
        return f'{self.user.username}: {self.food.name}, {self.grams} g ({self.date})'
