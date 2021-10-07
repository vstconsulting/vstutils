# Generated by Django 2.2.17 on 2021-01-27 04:55

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0010_auto_20201214_0325'),
    ]

    operations = [
        migrations.CreateModel(
            name='HostList',
            fields=[
            ],
            options={
                'proxy': True,
                'indexes': [],
                'constraints': [],
            },
            bases=('test_proj.host',),
        ),
        migrations.AddField(
            model_name='post',
            name='fa_icon_rating',
            field=models.FloatField(default=0),
        ),
        migrations.AddField(
            model_name='post',
            name='rating',
            field=models.FloatField(default=0),
        ),
    ]