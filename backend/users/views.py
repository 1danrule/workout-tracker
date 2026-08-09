from rest_framework import generics, permissions

from .models import Profile
from .serializers import RegisterSerializer, ProfileSerializer


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
        # Always return the profile belonging to the logged-in user,
        # never let a user view/edit someone else's profile.
        return Profile.objects.get(user=self.request.user)
