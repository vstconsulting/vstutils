# Generated by Django 3.2.6 on 2021-08-25 00:57

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0024_masked_and_phone_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='author',
            name='decimal',
            field=models.DecimalField(decimal_places=2, default='13.37', max_digits=5),
        ),
    ]
