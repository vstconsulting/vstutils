# Generated by Django 3.2.6 on 2021-11-19 02:50

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0027_changedpkfield_modelwithchangedfk'),
    ]

    operations = [
        migrations.AddField(
            model_name='listoffiles',
            name='test',
            field=models.CharField(choices=[(0, 0), (1, 1), (2, 2)], default=None, max_length=3),
            preserve_default=False,
        ),
        migrations.CreateModel(
            name='Category',
            fields=[
                ('id', models.AutoField(max_length=20, primary_key=True, serialize=False)),
                ('hidden', models.BooleanField(default=False)),
                ('name', models.CharField(max_length=256)),
                ('parent', models.ForeignKey(default=None, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='categories', to='test_proj.category')),
            ],
            options={
                'default_related_name': 'categories',
            },
        ),
        migrations.AddField(
            model_name='post',
            name='category',
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, related_name='post', to='test_proj.category'),
        ),
    ]