from django.db import migrations
from django.utils import timezone


def archive_datetime_polls(apps, schema_editor):
    """The datetime poll kind was removed from the app; nothing renders a voting
    UI for it anymore. Archive any leftover rows instead of leaving them as
    inert, unlabeled cards stuck in the default feed."""
    Poll = apps.get_model("polls", "Poll")
    Poll.objects.filter(kind="datetime", deleted_at__isnull=True).update(deleted_at=timezone.now())


class Migration(migrations.Migration):

    dependencies = [
        ("polls", "0005_alter_poll_kind"),
    ]

    operations = [
        migrations.RunPython(archive_datetime_polls, migrations.RunPython.noop),
    ]
