from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('MercAPI', '0050_update_loadnotification_sms_to_whatsapp'),
    ]

    operations = [
        migrations.AddField(
            model_name='notification',
            name='is_read',
            field=models.BooleanField(default=False, help_text='Whether the recipient has read this notification in the app'),
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['recipient', 'is_read'], name='mercapi_notif_recip_read_idx'),
        ),
    ]
