# Generated by Django 4.2.8 on 2023-12-20 06:45

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('test_proj', '0042_testexternalcustommodel'),
    ]

    operations = [
        migrations.CreateModel(
            name='Manufacturer',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
            ],
            options={
                'default_related_name': 'manufacturers',
            },
        ),
        migrations.CreateModel(
            name='Store',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
            ],
            options={
                'default_related_name': 'stores',
            },
        ),
        migrations.CreateModel(
            name='Product',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('price', models.DecimalField(decimal_places=2, max_digits=10)),
                ('manufacturer', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='test_proj.manufacturer')),
                ('store', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='test_proj.store')),
            ],
            options={
                'default_related_name': 'products',
            },
        ),
        migrations.CreateModel(
            name='Option',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='test_proj.product')),
            ],
            options={
                'default_related_name': 'options',
            },
        ),
        migrations.AddField(
            model_name='manufacturer',
            name='store',
            field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='test_proj.store'),
        ),
        migrations.CreateModel(
            name='Attribute',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=255)),
                ('product', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='test_proj.product')),
            ],
            options={
                'default_related_name': 'attributes',
            },
        ),
    ]