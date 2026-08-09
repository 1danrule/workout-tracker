from rest_framework import generics, permissions

from .models import Exercise
from .serializers import ExerciseSerializer


class ExerciseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/exercises/  - anyone logged in can browse the library
    POST /api/exercises/  - only staff/admin can add new exercises
    (keeps the shared library clean - regular users can't spam it)
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


class ExerciseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/exercises/<id>/ - view a single exercise
    PATCH  /api/exercises/<id>/ - edit it (admin only)
    DELETE /api/exercises/<id>/ - remove it (admin only)
    """
    queryset = Exercise.objects.all()
    serializer_class = ExerciseSerializer

    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]
