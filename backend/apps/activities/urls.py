from django.urls import path, include
from . import views

activity_patterns = [
    path("", views.ActivityDetailView.as_view()),
    path("join/", views.JoinActivityView.as_view()),
    path("feed/", views.FeedView.as_view()),
    path("members/", views.MemberListView.as_view()),
    path("members/<uuid:pk>/claim/", views.MemberClaimView.as_view()),
    path("logs/", views.LogListView.as_view()),
    path("cycles/", views.CycleCreateView.as_view()),
    path("cycles/<int:pk>/", views.CycleDetailView.as_view()),
    path("comments/", views.CommentListCreateView.as_view()),
    path("comments/<int:pk>/", views.CommentDetailView.as_view()),
    path("", include("apps.polls.urls")),
    path("", include("apps.events.urls")),
]

urlpatterns = [
    path("", views.ActivityListCreateView.as_view()),
    path("<str:activity_id>/", include(activity_patterns)),
]
