# Generated by Django 3.2 on 2021-05-14 04:26

from django.db import migrations
import vstutils.models.fields


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0018_deepnestedmodel'),
    ]

    operations = [
        migrations.AddField(
            model_name='modelwithbinaryfiles',
            name='some_multiplefile_none',
            field=vstutils.models.fields.MultipleFileField(blank=True, default=None, null=True, upload_to=''),
        ),
        migrations.AlterField(
            model_name='modelwithbinaryfiles',
            name='some_multipleimage',
            field=vstutils.models.fields.MultipleImageField(blank=True, default='', upload_to=''),
        ),
    ]
