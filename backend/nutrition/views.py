from datetime import timedelta
from decimal import Decimal
import re
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
    if user and user.is_authenticated:
        return Food.objects.filter(Q(owner__isnull=True) | Q(owner=user))
    return Food.objects.filter(owner__isnull=True)


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


class FoodSearchFilter(filters.SearchFilter):
    """Normalize common typos/endings like варенные -> вареные, жаренная -> жареная."""
    def get_search_terms(self, request):
        terms = super().get_search_terms(request)
        normalized = []
        for term in terms:
            t = term.replace('варенн', 'варен').replace('жаренн', 'жарен').replace('запеченн', 'запечен')
            normalized.append(t)
        return normalized


class FoodListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/nutrition/foods/?search=chicken   - search by name or brand
    GET  /api/nutrition/foods/?barcode=123456   - find by barcode
    POST /api/nutrition/foods/                  - add your own custom food
    """
    serializer_class = FoodSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [FoodSearchFilter]
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


def _safe_float(val):
    if val is None:
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def _get_serving_quantity(product_data):
    sq = product_data.get('serving_quantity')
    if sq is not None:
        try:
            val = float(sq)
            if val > 0:
                return val
        except (ValueError, TypeError):
            pass
    ss = product_data.get('serving_size', '')
    if isinstance(ss, str) and ss:
        match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:g|г|ml|мл)\b', ss, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1).replace(',', '.'))
            except ValueError:
                pass
    return None


def _parse_off_product(product_data, barcode=''):
    nutriments = product_data.get('nutriments', {})
    serving_qty = _get_serving_quantity(product_data)

    def get_macro(keys_100g, keys_serving):
        for k in keys_100g:
            val = _safe_float(nutriments.get(k))
            if val is not None and val >= 0:
                return round(val, 1)
        for k in keys_serving:
            val = _safe_float(nutriments.get(k))
            if val is not None and val >= 0:
                if serving_qty and serving_qty > 0:
                    return round((val / serving_qty) * 100.0, 1)
                return round(val, 1)
        return 0.0

    # Calories (kcal)
    kcal_keys_100g = [
        'energy-kcal_100g', 'energy-kcal_value', 'energy-kcal',
        'energy_kcal_100g', 'energy_kcal_value', 'energy_kcal',
        'energy-kcal_prepared_100g', 'energy-kcal_prepared_value', 'energy-kcal_prepared',
        'energy_kcal_prepared_100g', 'energy_kcal_prepared_value', 'energy_kcal_prepared',
    ]
    calories = None
    for k in kcal_keys_100g:
        val = _safe_float(nutriments.get(k))
        if val is not None and val > 0:
            calories = round(val, 1)
            break

    if calories is None:
        for k in [
            'energy_100g', 'energy_value', 'energy',
            'energy-kj_100g', 'energy-kj_value', 'energy-kj',
            'energy_prepared_100g', 'energy_prepared_value', 'energy_prepared',
            'energy-kj_prepared_100g', 'energy-kj_prepared_value', 'energy-kj_prepared',
        ]:
            val = _safe_float(nutriments.get(k))
            if val is not None and val > 0:
                calories = round(val / 4.184, 1)
                break

    if calories is None:
        for k in [
            'energy-kcal_serving', 'energy_kcal_serving',
            'energy-kcal_prepared_serving', 'energy_kcal_prepared_serving',
        ]:
            val = _safe_float(nutriments.get(k))
            if val is not None and val > 0:
                if serving_qty and serving_qty > 0:
                    calories = round((val / serving_qty) * 100.0, 1)
                else:
                    calories = round(val, 1)
                break

    if calories is None:
        for k in [
            'energy_serving', 'energy-kj_serving',
            'energy_prepared_serving', 'energy-kj_prepared_serving',
        ]:
            val = _safe_float(nutriments.get(k))
            if val is not None and val > 0:
                kj_cal = val / 4.184
                if serving_qty and serving_qty > 0:
                    calories = round((kj_cal / serving_qty) * 100.0, 1)
                else:
                    calories = round(kj_cal, 1)
                break

    calories = calories or 0.0

    protein = get_macro(
        [
            'proteins_100g', 'proteins_value', 'proteins', 'protein_100g', 'protein',
            'proteins_prepared_100g', 'proteins_prepared_value', 'proteins_prepared',
            'protein_prepared_100g', 'protein_prepared',
        ],
        ['proteins_serving', 'protein_serving', 'proteins_prepared_serving', 'protein_prepared_serving']
    )
    fat = get_macro(
        [
            'fat_100g', 'fat_value', 'fat',
            'fat_prepared_100g', 'fat_prepared_value', 'fat_prepared',
        ],
        ['fat_serving', 'fat_prepared_serving']
    )
    carbs = get_macro(
        [
            'carbohydrates_100g', 'carbohydrates_value', 'carbohydrates', 'carbs_100g', 'carbs',
            'carbohydrates_prepared_100g', 'carbohydrates_prepared_value', 'carbohydrates_prepared',
            'carbs_prepared_100g', 'carbs_prepared',
        ],
        ['carbohydrates_serving', 'carbs_serving', 'carbohydrates_prepared_serving', 'carbs_prepared_serving']
    )

    name_candidates = [
        product_data.get('product_name'),
        product_data.get('product_name_ru'),
        product_data.get('product_name_en'),
        product_data.get('product_name_de'),
        product_data.get('generic_name'),
        product_data.get('generic_name_ru'),
        product_data.get('generic_name_en'),
        product_data.get('abbreviated_product_name'),
    ]
    name = next((n.strip() for n in name_candidates if isinstance(n, str) and n.strip()), 'Unknown Product')

    brand = product_data.get('brands', '') or product_data.get('brand', '') or ''
    if isinstance(brand, str) and brand:
        brand = brand.split(',')[0].strip()

    code = barcode or product_data.get('code', '') or ''

    return {
        'name': name,
        'brand': brand,
        'barcode': str(code).strip(),
        'calories_per_100g': float(calories),
        'protein_per_100g': float(protein),
        'fat_per_100g': float(fat),
        'carbs_per_100g': float(carbs),
        'image_url': product_data.get('image_url') or product_data.get('image_front_url', ''),
    }


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
            results.append(_parse_off_product(product))

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

        parsed = _parse_off_product(product_data, barcode=barcode)
        return Response(parsed)


class CalorieHistoryView(APIView):
    """
    GET /api/nutrition/calorie-history/?days=7
    Returns daily intake for the last N days with targets.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            days = int(request.query_params.get('days', 7))
        except ValueError:
            days = 7

        days = max(1, min(days, 90))
        today = timezone.localdate()
        start_date = today - timedelta(days=days - 1)

        entries = FoodEntry.objects.filter(
            user=request.user,
            date__gte=start_date,
            date__lte=today,
        ).select_related('food')

        daily_map = {}
        for i in range(days):
            d = (start_date + timedelta(days=i)).isoformat()
            daily_map[d] = {
                'date': d,
                'calories': 0.0,
                'protein_g': 0.0,
                'fat_g': 0.0,
                'carbs_g': 0.0,
            }

        for entry in entries:
            d_str = entry.date.isoformat()
            if d_str in daily_map:
                daily_map[d_str]['calories'] += float(entry.calories)
                daily_map[d_str]['protein_g'] += float(entry.protein)
                daily_map[d_str]['fat_g'] += float(entry.fat)
                daily_map[d_str]['carbs_g'] += float(entry.carbs)

        targets = calculate_targets(request.user.profile)
        target_calories = targets['calories'] if targets else None

        results = []
        for d in sorted(daily_map.keys()):
            item = daily_map[d]
            item['calories'] = round(item['calories'], 1)
            item['protein_g'] = round(item['protein_g'], 1)
            item['fat_g'] = round(item['fat_g'], 1)
            item['carbs_g'] = round(item['carbs_g'], 1)
            item['target_calories'] = target_calories
            results.append(item)

        return Response({
            'days': days,
            'start_date': start_date.isoformat(),
            'end_date': today.isoformat(),
            'target_calories': target_calories,
            'history': results,
        })
