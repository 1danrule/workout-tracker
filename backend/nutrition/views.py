from datetime import timedelta
from decimal import Decimal
import requests as http_requests

from django.db.models import Q, ProtectedError
from django.utils import timezone
from django.utils.dateparse import parse_date
from rest_framework import filters, generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from .calculator import calculate_targets
from .models import Food, FoodEntry
from .serializers import FoodEntrySerializer, FoodSerializer


def visible_foods(user):
    """Shared foods plus this user's own custom foods."""
    return Food.objects.filter(Q(owner__isnull=True) | Q(owner=user))


def get_date_param(request):
    """Reads ?date=YYYY-MM-DD. Returns None if it wasn't passed."""
    raw = request.query_params.get('date')
    if not raw:
        return None
    try:
        parsed = parse_date(raw)
    except ValueError:
        parsed = None
    if parsed is None:
        raise ValidationError({'date': 'Use the format YYYY-MM-DD.'})
    return parsed


class FoodListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/nutrition/foods/?search=chicken   - search by name or brand
    GET  /api/nutrition/foods/?barcode=123456   - find by barcode
    POST /api/nutrition/foods/                  - add your own custom food
    """
    serializer_class = FoodSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'brand']

    def get_queryset(self):
        queryset = visible_foods(self.request.user)
        barcode = self.request.query_params.get('barcode')
        if barcode:
            queryset = queryset.filter(barcode=barcode)
        return queryset

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, source=Food.Source.MANUAL)


class FoodDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/nutrition/foods/<id>/  - any food you can see
    PATCH  /api/nutrition/foods/<id>/  - only your own foods
    DELETE /api/nutrition/foods/<id>/  - only your own foods
    """
    serializer_class = FoodSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if self.request.method in permissions.SAFE_METHODS:
            return visible_foods(self.request.user)
        return Food.objects.filter(owner=self.request.user)

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {'detail': 'This food is used in your diary and cannot be deleted.'},
                status=status.HTTP_409_CONFLICT,
            )


class FoodEntryListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/nutrition/entries/?date=2026-10-30  - your diary for a day
    POST /api/nutrition/entries/                  - log a food
    """
    serializer_class = FoodEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = FoodEntry.objects.filter(
            user=self.request.user
        ).select_related('food')
        day = get_date_param(self.request)
        if day:
            queryset = queryset.filter(date=day)
        return queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class FoodEntryDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET / PATCH / DELETE /api/nutrition/entries/<id>/
    Only your own entries.
    """
    serializer_class = FoodEntrySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FoodEntry.objects.filter(
            user=self.request.user
        ).select_related('food')


class DailySummaryView(APIView):
    """
    GET /api/nutrition/summary/?date=2026-10-30

    Totals eaten that day, the daily targets from your profile
    (null if the profile is incomplete) and what is left.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        day = get_date_param(request) or timezone.localdate()
        entries = FoodEntry.objects.filter(
            user=request.user, date=day
        ).select_related('food')

        sums = {
            'calories': Decimal('0'),
            'protein_g': Decimal('0'),
            'fat_g': Decimal('0'),
            'carbs_g': Decimal('0'),
        }
        for entry in entries:
            sums['calories'] += entry.calories
            sums['protein_g'] += entry.protein
            sums['fat_g'] += entry.fat
            sums['carbs_g'] += entry.carbs
        totals = {key: round(float(value), 1) for key, value in sums.items()}

        targets = calculate_targets(request.user.profile)
        remaining = None
        if targets:
            remaining = {
                key: round(targets[key] - totals[key], 1) for key in totals
            }

        return Response({
            'date': day.isoformat(),
            'totals': totals,
            'targets': targets,
            'remaining': remaining,
        })


class OpenFoodFactsSearchView(APIView):
    """GET /api/nutrition/off-search/?query=chicken&page=1"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        query = request.query_params.get('query', '')
        page = request.query_params.get('page', '1')
        if not query:
            return Response({'results': []})

        url = 'https://world.openfoodfacts.org/cgi/search.pl'
        params = {
            'search_terms': query,
            'search_simple': 1,
            'action': 'process',
            'json': 1,
            'page': page,
            'page_size': 20,
        }
        headers = {
            'User-Agent': 'FitTracker - iOS - Version 1.0 (contact@fittracker.app)',
        }
        try:
            resp = http_requests.get(url, params=params, headers=headers, timeout=10)
            resp.raise_for_status()
            data = resp.json()
        except Exception:
            return Response({'results': [], 'error': 'Could not reach Open Food Facts.'}, status=502)

        results = []
        for product in data.get('products', []):
            nutriments = product.get('nutriments', {})
            results.append({
                'name': product.get('product_name', 'Unknown'),
                'brand': product.get('brands', ''),
                'barcode': product.get('code', ''),
                'calories_per_100g': nutriments.get('energy-kcal_100g', 0),
                'protein_per_100g': nutriments.get('proteins_100g', 0),
                'fat_per_100g': nutriments.get('fat_100g', 0),
                'carbs_per_100g': nutriments.get('carbohydrates_100g', 0),
                'image_url': product.get('image_url', ''),
            })

        return Response({
            'results': results,
            'count': data.get('count', 0),
            'page': int(page),
        })


class OpenFoodFactsBarcodeView(APIView):
    """GET /api/nutrition/off-barcode/?barcode=123456"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        barcode = request.query_params.get('barcode', '').strip()
        if not barcode:
            return Response({'error': 'barcode is required'}, status=400)

        # 1. Check local database first (cached or custom food)
        local_food = visible_foods(request.user).filter(barcode=barcode).first()
        if local_food:
            return Response({
                'id': local_food.id,
                'name': local_food.name,
                'brand': local_food.brand,
                'barcode': local_food.barcode,
                'calories_per_100g': float(local_food.calories_per_100g),
                'protein_per_100g': float(local_food.protein_per_100g),
                'fat_per_100g': float(local_food.fat_per_100g),
                'carbs_per_100g': float(local_food.carbs_per_100g),
                'image_url': '',
            })

        # 2. Query Open Food Facts with proper User-Agent
        headers = {
            'User-Agent': 'FitTracker - iOS - Version 1.0 (contact@fittracker.app)',
        }

        # Try v2 first, then fallback to v0
        urls = [
            f'https://world.openfoodfacts.org/api/v2/product/{barcode}.json',
            f'https://world.openfoodfacts.org/api/v0/product/{barcode}.json',
        ]

        product_data = None
        for url in urls:
            try:
                resp = http_requests.get(url, headers=headers, timeout=8)
                if resp.status_code == 200:
                    data = resp.json()
                    if data.get('status') == 1 and data.get('product'):
                        product_data = data.get('product')
                        break
            except Exception:
                continue

        if not product_data:
            return Response({'error': f'Product with barcode {barcode} not found in database.'}, status=404)

        nutriments = product_data.get('nutriments', {})
        calories = nutriments.get('energy-kcal_100g') or nutriments.get('energy-kcal')
        if calories is None:
            kj = nutriments.get('energy_100g') or nutriments.get('energy')
            calories = round(float(kj) / 4.184, 1) if kj else 0

        return Response({
            'name': product_data.get('product_name') or product_data.get('product_name_en') or 'Unknown Product',
            'brand': product_data.get('brands', ''),
            'barcode': barcode,
            'calories_per_100g': float(calories or 0),
            'protein_per_100g': float(nutriments.get('proteins_100g') or nutriments.get('proteins') or 0),
            'fat_per_100g': float(nutriments.get('fat_100g') or nutriments.get('fat') or 0),
            'carbs_per_100g': float(nutriments.get('carbohydrates_100g') or nutriments.get('carbohydrates') or 0),
            'image_url': product_data.get('image_url', ''),
        })
