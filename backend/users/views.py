from datetime import timedelta
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .models import Profile, WeightLog
from .serializers import RegisterSerializer, ProfileSerializer, WeightLogSerializer


class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Anyone can create an account here - no auth required.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET  /api/auth/profile/  - view your own profile
    PATCH/PUT /api/auth/profile/ - update your own profile
    Requires a valid JWT access token in the Authorization header.
    """
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        return profile


class WeightLogListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/auth/weight-history/?days=30
    POST /api/auth/weight-history/ - log weight { weight_kg, date }
    """
    serializer_class = WeightLogSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = WeightLog.objects.filter(user=self.request.user).order_by('date')
        days = self.request.query_params.get('days')
        if days:
            try:
                days_int = int(days)
                since = timezone.localdate() - timedelta(days=days_int)
                queryset = queryset.filter(date__gte=since)
            except ValueError:
                pass
        return queryset

    def perform_create(self, serializer):
        weight_log = serializer.save(user=self.request.user)
        # Also sync current weight to user profile
        profile, _ = Profile.objects.get_or_create(user=self.request.user)
        profile.weight_kg = weight_log.weight_kg
        profile.save(update_fields=['weight_kg'])
