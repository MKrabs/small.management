from django.urls import path, include

urlpatterns = [
    path("api/auth/", include("apps.accounts.urls")),
    path("api/activities/", include("apps.activities.urls")),
]
