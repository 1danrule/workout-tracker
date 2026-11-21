from unittest.mock import patch, MagicMock
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class OpenFoodFactsTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='nutriuser', password='password123')
        self.client.force_authenticate(user=self.user)

    @patch('nutrition.views.http_requests.get')
    def test_search_view(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.json.return_value = {
            'count': 1,
            'products': [{
                'product_name': 'Oats',
                'brands': 'Quaker',
                'code': '123456789',
                'nutriments': {
                    'energy-kcal_100g': 370,
                    'proteins_100g': 13,
                    'fat_100g': 7,
                    'carbohydrates_100g': 60,
                },
                'image_url': 'http://example.com/oats.jpg',
            }]
        }
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        url = reverse('off-search')
        resp = self.client.get(url, {'query': 'oats', 'page': '1'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['count'], 1)
        self.assertEqual(len(resp.data['results']), 1)
        self.assertEqual(resp.data['results'][0]['name'], 'Oats')
        self.assertEqual(resp.data['results'][0]['calories_per_100g'], 370)

    @patch('nutrition.views.http_requests.get')
    def test_barcode_view(self, mock_get):
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            'status': 1,
            'product': {
                'product_name': 'Greek Yogurt',
                'brands': 'Fage',
                'nutriments': {
                    'energy-kcal_100g': 57,
                    'proteins_100g': 10,
                    'fat_100g': 0,
                    'carbohydrates_100g': 4,
                },
                'image_url': 'http://example.com/yogurt.jpg',
            }
        }
        mock_resp.raise_for_status.return_value = None
        mock_get.return_value = mock_resp

        url = reverse('off-barcode')
        resp = self.client.get(url, {'barcode': '5201051001077'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['name'], 'Greek Yogurt')
        self.assertEqual(resp.data['brand'], 'Fage')
        self.assertEqual(resp.data['barcode'], '5201051001077')
        self.assertEqual(resp.data['protein_per_100g'], 10)


class NutritionParserTests(APITestCase):
    def test_parse_prepared_nutrients_kinder_pingui(self):
        from nutrition.views import _parse_off_product

        raw_product = {
            'product_name': 'Kinder Pinguin',
            'brands': 'Kinder, Ferrero',
            'code': '4008400290829',
            'nutriments': {
                'energy-kcal_prepared_100g': 450,
                'energy-kj_prepared_100g': 1870,
                'proteins_prepared_100g': 7.0,
                'fat_prepared_100g': 29.7,
                'carbohydrates_prepared_100g': 37.7,
            },
        }
        parsed = _parse_off_product(raw_product, '4008400290829')
        self.assertEqual(parsed['name'], 'Kinder Pinguin')
        self.assertEqual(parsed['brand'], 'Kinder')
        self.assertEqual(parsed['calories_per_100g'], 450.0)
        self.assertEqual(parsed['protein_per_100g'], 7.0)
        self.assertEqual(parsed['fat_per_100g'], 29.7)
        self.assertEqual(parsed['carbs_per_100g'], 37.7)

    def test_parse_kj_fallback(self):
        from nutrition.views import _parse_off_product

        raw_product = {
            'product_name': 'Pure Energy Drink',
            'nutriments': {
                'energy_100g': 837,  # ~200 kcal
                'proteins_100g': 0,
                'fat_100g': 0,
                'carbohydrates_100g': 50,
            },
        }
        parsed = _parse_off_product(raw_product)
        # 837 / 4.184 = 200.0 kcal
        self.assertEqual(parsed['calories_per_100g'], 200.0)

    def test_parse_serving_fallback(self):
        from nutrition.views import _parse_off_product

        raw_product = {
            'product_name': 'Protein Bar',
            'serving_quantity': 50,  # 50g bar
            'nutriments': {
                'energy-kcal_serving': 150,  # 150 kcal per 50g -> 300 kcal per 100g
                'proteins_serving': 15,     # 15g protein per 50g -> 30g per 100g
                'fat_serving': 5,           # 5g fat per 50g -> 10g per 100g
                'carbohydrates_serving': 12, # 12g carbs per 50g -> 24g per 100g
            },
        }
        parsed = _parse_off_product(raw_product)
        self.assertEqual(parsed['calories_per_100g'], 300.0)
        self.assertEqual(parsed['protein_per_100g'], 30.0)
        self.assertEqual(parsed['fat_per_100g'], 10.0)
        self.assertEqual(parsed['carbs_per_100g'], 24.0)

    def test_russian_name_fallback(self):
        from nutrition.views import _parse_off_product

        raw_product = {
            'product_name': '',
            'product_name_ru': 'Творог зерненый',
            'nutriments': {
                'energy-kcal_100g': 105,
            },
        }
        parsed = _parse_off_product(raw_product)
        self.assertEqual(parsed['name'], 'Творог зерненый')


class FoodSearchAndSeededTests(APITestCase):
    def setUp(self):
        from nutrition.models import Food

        self.user = User.objects.create_user(username='testuser', password='pass')
        self.client.force_authenticate(user=self.user)

        Food.objects.create(
            name='Макароны (вареные)',
            brand='Гарнир',
            calories_per_100g=103,
            protein_per_100g=3.8,
            fat_per_100g=0.6,
            carbs_per_100g=20.0,
            owner=None,
        )
        Food.objects.create(
            name='Картофельное пюре (на молоке)',
            brand='Гарнир / пюре',
            calories_per_100g=106,
            protein_per_100g=2.0,
            fat_per_100g=4.2,
            carbs_per_100g=15.0,
            owner=None,
        )
        Food.objects.create(
            name='Гречка (вареная на воде)',
            brand='Гарнир',
            calories_per_100g=110,
            protein_per_100g=4.2,
            fat_per_100g=1.3,
            carbs_per_100g=21.3,
            owner=None,
        )

    def test_search_double_n_normalization(self):
        url = reverse('food-list')
        # User searches with double "н" -> варенные макароны
        resp = self.client.get(url, {'search': 'варенные макароны'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Макароны (вареные)')

    def test_search_puree(self):
        url = reverse('food-list')
        resp = self.client.get(url, {'search': 'пюре'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Картофельное пюре (на молоке)')

    def test_search_buckwheat(self):
        url = reverse('food-list')
        # User searches with double "н" -> варенная гречка
        resp = self.client.get(url, {'search': 'варенная гречка'})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        results = resp.data if isinstance(resp.data, list) else resp.data.get('results', [])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['name'], 'Гречка (вареная на воде)')
