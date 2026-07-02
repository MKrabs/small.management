from django.urls import path
from . import views

urlpatterns = [
    path("events/<int:pk>/", views.EventDetailView.as_view()),
    path("events/<int:event_id>/rsvps/", views.RSVPView.as_view()),
]
