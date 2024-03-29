# Generated by Django 3.2.12 on 2022-03-11 08:05

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0033_modelwithuuid'),
    ]

    operations = [
        migrations.CreateModel(
            name='AnotherDeepNested',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=256)),
                ('parent', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='child', to='test_proj.anotherdeepnested')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
