from django.urls import path

from .views import (
    DailySummaryView,
    FoodDetailView,
    FoodEntryDetailView,
    FoodEntryListCreateView,
    FoodListCreateView,
    OpenFoodFactsBarcodeView,
    OpenFoodFactsSearchView,
)

urlpatterns = [
    path('foods/', FoodListCreateView.as_view(), name='food-list'),
    path('foods/<int:pk>/', FoodDetailView.as_view(), name='food-detail'),
    path('entries/', FoodEntryListCreateView.as_view(), name='entry-list'),
    path('entries/<int:pk>/', FoodEntryDetailView.as_view(), name='entry-detail'),
    path('summary/', DailySummaryView.as_view(), name='daily-summary'),
    path('off-search/', OpenFoodFactsSearchView.as_view(), name='off-search'),
    path('off-barcode/', OpenFoodFactsBarcodeView.as_view(), name='off-barcode'),
]
