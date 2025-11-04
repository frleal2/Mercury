from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('MercAPI', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='DriverApplication',
            fields=[
                ('id', models.AutoField(primary_key=True, serialize=False)),
                ('first_name', models.CharField(max_length=255, default="", null=False)),
                ('middle_name', models.CharField(max_length=255, blank=True, null=True, default="")),
                ('last_name', models.CharField(max_length=255, default="", null=False)),
                ('email', models.EmailField(max_length=254, default="", null=False)),
            ],
        ),
    ]
