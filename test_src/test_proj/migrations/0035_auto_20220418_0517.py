# Generated by Django 3.2.12 on 2022-04-18 05:17

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0034_anotherdeepnested'),
    ]

    operations = [
        migrations.AddField(
            model_name='author',
            name='detail_information',
            field=models.JSONField(null=True),
        ),
        migrations.AddField(
            model_name='post',
            name='some_data',
            field=models.CharField(blank=True, max_length=300, null=True),
        ),
        migrations.AlterField(
            model_name='post',
            name='author',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='post', to='test_proj.author'),
        ),
    ]
