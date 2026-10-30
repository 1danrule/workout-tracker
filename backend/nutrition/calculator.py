"""
Daily calorie and macro targets.

Calories: Mifflin-St Jeor equation for resting energy (BMR), multiplied
by an activity factor, then shifted up or down depending on the goal.
Macros: protein and fat are set per kg of body weight, carbs fill the
rest of the calories.

All of this is an estimate for orientation, not medical advice.
"""

ACTIVITY_FACTORS = {
    'sedentary': 1.2,
    'light': 1.375,
    'moderate': 1.55,
    'high': 1.725,
    'very_high': 1.9,
}

# Calorie adjustment relative to maintenance.
GOAL_CALORIE_ADJUSTMENT = {
    'bulk': 300,
    'cut': -400,
    'maintain': 0,
}

# Grams of protein per kg of body weight.
PROTEIN_PER_KG = {
    'bulk': 1.8,
    'cut': 2.0,
    'maintain': 1.8,
}
FAT_PER_KG = 0.9

KCAL_PER_G_PROTEIN = 4
KCAL_PER_G_FAT = 9
KCAL_PER_G_CARBS = 4


def calculate_bmr(weight_kg, height_cm, age, sex):
    """Mifflin-St Jeor: kcal per day at rest."""
    base = 10 * weight_kg + 6.25 * height_cm - 5 * age
    return base + 5 if sex == 'male' else base - 161


def calculate_targets(profile):
    """
    Returns a dict with calories, protein, fat and carbs for the day,
    or None if the profile doesn't have enough data yet.
    """
    if not all([
        profile.weight_kg, profile.height_cm, profile.age,
        profile.sex, profile.activity_level, profile.goal,
    ]):
        return None

    weight = float(profile.weight_kg)
    bmr = calculate_bmr(weight, profile.height_cm, profile.age, profile.sex)
    maintenance = bmr * ACTIVITY_FACTORS[profile.activity_level]
    calories = maintenance + GOAL_CALORIE_ADJUSTMENT[profile.goal]

    protein = PROTEIN_PER_KG[profile.goal] * weight
    fat = FAT_PER_KG * weight
    carbs_kcal = calories - protein * KCAL_PER_G_PROTEIN - fat * KCAL_PER_G_FAT
    carbs = max(carbs_kcal / KCAL_PER_G_CARBS, 0)

    return {
        'calories': round(calories),
        'protein_g': round(protein),
        'fat_g': round(fat),
        'carbs_g': round(carbs),
    }
