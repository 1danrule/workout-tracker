from django.contrib import admin
from .models import Profile


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'goal', 'weight_kg', 'height_cm', 'age')
    list_filter = ('goal',)
    search_fields = ('user__username',)
