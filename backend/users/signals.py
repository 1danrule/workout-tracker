from django.conf import settings
from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Profile


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_profile_for_new_user(sender, instance, created, **kwargs):
    """
    Every time a new User is created (including via createsuperuser),
    automatically create a matching Profile for them.
    """
    if created:
        Profile.objects.create(user=instance)
