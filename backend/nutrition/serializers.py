from rest_framework import serializers

from .models import Food, FoodEntry


class FoodSerializer(serializers.ModelSerializer):
    # True for the user's own products, False for shared ones.
    is_custom = serializers.SerializerMethodField()

    class Meta:
        model = Food
        fields = (
            'id', 'name', 'brand', 'barcode',
            'calories_per_100g', 'protein_per_100g',
            'fat_per_100g', 'carbs_per_100g',
            'source', 'is_custom',
        )
        read_only_fields = ('source',)
        extra_kwargs = {
            'calories_per_100g': {'min_value': 0},
            'protein_per_100g': {'min_value': 0},
            'fat_per_100g': {'min_value': 0},
            'carbs_per_100g': {'min_value': 0},
        }

    def get_is_custom(self, obj):
        return obj.owner_id is not None


class FoodEntrySerializer(serializers.ModelSerializer):
    # Full food info for display, so the app doesn't need a second request.
    food_detail = FoodSerializer(source='food', read_only=True)

    # Calculated in the model (grams * value per 100 g / 100).
    calories = serializers.DecimalField(max_digits=8, decimal_places=1, read_only=True)
    protein = serializers.DecimalField(max_digits=8, decimal_places=1, read_only=True)
    fat = serializers.DecimalField(max_digits=8, decimal_places=1, read_only=True)
    carbs = serializers.DecimalField(max_digits=8, decimal_places=1, read_only=True)

    class Meta:
        model = FoodEntry
        fields = (
            'id', 'food', 'food_detail', 'grams', 'date', 'meal',
            'calories', 'protein', 'fat', 'carbs',
        )

    def validate_grams(self, value):
        if value <= 0:
            raise serializers.ValidationError('Grams must be greater than 0.')
        return value

    def validate_food(self, food):
        # A user may log shared foods and their own foods, never
        # someone else's custom food.
        user = self.context['request'].user
        if food.owner_id not in (None, user.id):
            raise serializers.ValidationError('Food not found.')
        return food
