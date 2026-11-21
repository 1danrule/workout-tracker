from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('nutrition', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='food',
            name='serving_grams',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=7, null=True),
        ),
        migrations.AddField(
            model_name='food',
            name='serving_name',
            field=models.CharField(blank=True, max_length=30),
        ),
    ]
