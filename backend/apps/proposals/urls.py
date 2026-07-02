from django.urls import path
from . import views

urlpatterns = [
    path("proposals/", views.ProposalListCreateView.as_view()),
    path("proposals/<int:pk>/", views.ProposalDetailView.as_view()),
    path("proposals/<int:pk>/finalize/", views.FinalizeProposalView.as_view()),
    path("proposals/<int:pk>/votes/", views.ProposalVoteCreateView.as_view()),
    path("proposals/<int:pk>/votes/<int:vote_id>/", views.ProposalVoteDetailView.as_view()),
]
