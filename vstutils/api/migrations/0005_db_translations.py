# Generated by Django 3.2 on 2021-06-03 06:12

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('vstutils_api', '0004_user_settings'),
    ]

    operations = [
        migrations.CreateModel(
            name='CustomTranslations',
            fields=[
                ('original', models.CharField(max_length=1024, primary_key=True, serialize=False)),
                ('translated', models.CharField(max_length=1024)),
                ('code', models.CharField(max_length=5)),
            ],
            options={
                'default_related_name': 'custom_translations',
            },
        ),
        migrations.AddIndex(
            model_name='customtranslations',
            index=models.Index(fields=['original', 'translated', 'code'], name='vstutils_api_translations'),
        ),
    ]
