# Generated by Django 3.2.6 on 2021-08-18 06:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0023_cachableproxymodel'),
    ]

    operations = [
        migrations.AddField(
            model_name='author',
            name='masked',
            field=models.CharField(max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='author',
            name='phone',
            field=models.CharField(max_length=16, null=True),
        ),
    ]
