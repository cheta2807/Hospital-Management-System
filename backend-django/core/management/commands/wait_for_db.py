import time

from django.core.management.base import BaseCommand, CommandError
from django.db import connections
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "Block until the default database accepts connections."

    def handle(self, *args, **options):
        for attempt in range(1, 31):
            try:
                connections["default"].ensure_connection()
                self.stdout.write(self.style.SUCCESS("Database is ready."))
                return
            except OperationalError:
                self.stdout.write(f"Waiting for database ({attempt}/30)...")
                time.sleep(2)
        raise CommandError("Database did not become available in time.")
