# Generated by Django 2.2.17 on 2021-01-27 23:51

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0011_auto_20210127_0455'),
    ]

    operations = [
        migrations.AddField(
            model_name='modelwithbinaryfiles',
            name='some_validatedmultiplenamedbinimage',
            field=models.TextField(default=''),
        ),
        migrations.AddField(
            model_name='modelwithbinaryfiles',
            name='some_validatednamedbinimage',
            field=models.TextField(default=''),
        ),
    ]
