# Generated by Django 3.2 on 2021-05-31 08:06

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0020_auto_20210517_0459'),
    ]

    operations = [
        migrations.CreateModel(
            name='ReadonlyDeepNestedModel',
            fields=[
                ('id', models.AutoField(max_length=20, primary_key=True, serialize=False)),
                ('hidden', models.BooleanField(default=False)),
                ('name', models.CharField(max_length=10)),
                ('parent', models.ForeignKey(default=None, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='readonly_deepnested', to='test_proj.readonlydeepnestedmodel')),
            ],
            options={
                'default_related_name': 'readonly_deepnested',
            },
        ),
    ]
