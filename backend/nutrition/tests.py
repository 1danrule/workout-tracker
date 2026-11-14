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
