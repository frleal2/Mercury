from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('MercAPI', '0052_rename_mercapi_notif_recip_read_idx_mercapi_not_recipie_4ad037_idx'),
    ]

    operations = [
        # Add in_app to Notification.channel choices (schema-level only; varchar max_length unchanged)
        migrations.AlterField(
            model_name='notification',
            name='channel',
            field=models.CharField(
                choices=[('email', 'Email'), ('whatsapp', 'WhatsApp'), ('in_app', 'In-App')],
                max_length=10,
            ),
        ),
        # New company-wide notification settings table
        migrations.CreateModel(
            name='CompanyNotificationSetting',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('notification_key', models.CharField(
                    max_length=50,
                    choices=[
                        ('load_quoted_customer',     'Load Quoted → Customer'),
                        ('load_booked_customer',     'Load Booked → Customer'),
                        ('load_dispatched_customer', 'Load Dispatched → Customer'),
                        ('load_in_transit_customer', 'Load In Transit → Customer'),
                        ('load_delivered_customer',  'Load Delivered → Customer'),
                        ('load_invoiced_customer',   'Load Invoiced → Customer'),
                        ('load_paid_customer',       'Load Paid → Customer'),
                        ('load_cancelled_customer',  'Load Cancelled → Customer'),
                        ('driver_load_assigned',     'Driver Assigned to Load'),
                        ('driver_load_reassigned',   'Driver Reassigned'),
                        ('trip_started_dispatcher',  'Trip Started → Dispatcher'),
                        ('compliance_driver_cdl',       'Driver CDL Expiration'),
                        ('compliance_driver_physical',  'Driver DOT Physical'),
                        ('compliance_driver_mvr',       'Driver MVR'),
                        ('compliance_driver_drug_test', 'Driver Drug/Alcohol Test'),
                        ('compliance_truck_registration',   'Truck Registration'),
                        ('compliance_truck_insurance',      'Truck Insurance'),
                        ('compliance_truck_license_plate',  'Truck License Plate'),
                        ('compliance_annual_inspection',    'Annual DOT Inspection'),
                        ('compliance_carrier_insurance',    'Carrier Insurance'),
                        ('compliance_maintenance',          'Maintenance Schedule'),
                        ('safety_vehicle_prohibited', 'Vehicle Prohibited'),
                        ('safety_vehicle_oos',        'Vehicle Out of Service'),
                        ('safety_vehicle_cleared',    'Vehicle Status Cleared'),
                    ],
                )),
                ('in_app_enabled', models.BooleanField(default=False)),
                ('email_enabled', models.BooleanField(default=False)),
                ('whatsapp_enabled', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('company', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_settings',
                    to='MercAPI.company',
                )),
                ('updated_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Company Notification Setting',
                'verbose_name_plural': 'Company Notification Settings',
                'ordering': ['company', 'notification_key'],
            },
        ),
        migrations.AlterUniqueTogether(
            name='companynotificationsetting',
            unique_together={('company', 'notification_key')},
        ),
    ]
