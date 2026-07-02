import secrets
import string
from django.db import migrations, models

_CHARS = string.ascii_lowercase + string.digits


def _gen(used):
    while True:
        candidate = "".join(secrets.choice(_CHARS) for _ in range(6))
        if candidate not in used:
            used.add(candidate)
            return candidate


def populate_short_ids(apps, schema_editor):
    Activity = apps.get_model("activities", "Activity")
    used = set()
    for obj in Activity.objects.all():
        obj.short_id = _gen(used)
        obj.save(update_fields=["short_id"])


def truncate_slugs(apps, schema_editor):
    Activity = apps.get_model("activities", "Activity")
    for obj in Activity.objects.extra(where=["LENGTH(slug) > 40"]):
        obj.slug = obj.slug[:40]
        obj.save(update_fields=["slug"])


class Migration(migrations.Migration):
    dependencies = [
        ("activities", "0002_initial"),
    ]

    operations = [
        # 1. add nullable, no unique yet
        migrations.AddField(
            model_name="activity",
            name="short_id",
            field=models.CharField(max_length=6, null=True),
        ),
        # 2. populate
        migrations.RunPython(populate_short_ids, migrations.RunPython.noop),
        # 3. make non-nullable + unique
        migrations.AlterField(
            model_name="activity",
            name="short_id",
            field=models.CharField(max_length=6, unique=True, db_index=True, default=""),
        ),
        # 4. truncate existing slug values, then shrink column
        migrations.RunPython(truncate_slugs, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="activity",
            name="slug",
            field=models.SlugField(max_length=40),
        ),
    ]
