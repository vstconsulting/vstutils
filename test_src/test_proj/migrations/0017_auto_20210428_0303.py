# Generated by Django 3.2 on 2021-04-28 03:03

from django.db import migrations
import vstutils.models.fields


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0016_modelwithfk_fk_with_filters'),
    ]

    operations = [
        migrations.AddField(
            model_name='modelwithbinaryfiles',
            name='some_multiplefile',
            field=vstutils.models.fields.MultipleFileField(blank=True, upload_to=''),
        ),
        migrations.AddField(
            model_name='modelwithbinaryfiles',
            name='some_multipleimage',
            field=vstutils.models.fields.MultipleImageField(blank=True, upload_to=''),
        ),
    ]
