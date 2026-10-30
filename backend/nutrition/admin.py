from django.contrib import admin

from .models import Food, FoodEntry


@admin.register(Food)
class FoodAdmin(admin.ModelAdmin):
    list_display = (
        'name', 'brand', 'calories_per_100g',
        'protein_per_100g', 'fat_per_100g', 'carbs_per_100g', 'owner',
    )
    list_filter = ('source',)
    search_fields = ('name', 'brand', 'barcode')


@admin.register(FoodEntry)
class FoodEntryAdmin(admin.ModelAdmin):
    list_display = ('user', 'food', 'grams', 'meal', 'date')
    list_filter = ('meal', 'date')
    search_fields = ('user__username', 'food__name')
