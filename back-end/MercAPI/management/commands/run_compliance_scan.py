"""
Management command: python manage.py run_compliance_scan

Runs the compliance scanner synchronously (useful for testing
and manual runs outside of Celery Beat).
"""
from django.core.management.base import BaseCommand
from MercAPI.scanners import scan_all_compliance


class Command(BaseCommand):
    help = 'Run compliance scanner to detect expiring documents, certifications, and insurance.'

    def handle(self, *args, **options):
        self.stdout.write('Starting compliance scan...')
        results = scan_all_compliance()
        self.stdout.write(self.style.SUCCESS(
            f"Scan complete — Tenants: {results['tenants_scanned']}  "
            f"Notifications: {results['notifications_created']}  "
            f"Errors: {len(results['errors'])}"
        ))
        for err in results['errors']:
            self.stdout.write(self.style.ERROR(f"  {err}"))
