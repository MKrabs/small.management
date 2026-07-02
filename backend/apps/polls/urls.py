from django.urls import path
from . import views

urlpatterns = [
    path("polls/", views.PollListCreateView.as_view()),
    path("polls/<int:pk>/", views.PollDetailView.as_view()),
    path("polls/<int:poll_id>/slots/", views.SlotListCreateView.as_view()),
    path("polls/<int:poll_id>/slots/<int:pk>/", views.SlotDetailView.as_view()),
]
