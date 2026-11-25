from datetime import datetime, timedelta

from django.utils import timezone

from .models import Appointment


def generate_slots(doctor):
    """All slot start times in a doctor's working day, e.g. 09:00, 09:30, ..."""
    step = timedelta(minutes=doctor.slot_minutes)
    cursor = datetime.combine(datetime.today(), doctor.available_from)
    end = datetime.combine(datetime.today(), doctor.available_to)
    slots = []
    while cursor + step <= end:
        slots.append(cursor.time())
        cursor += step
    return slots


def available_slots(doctor, day):
    booked = set(
        Appointment.objects.filter(doctor=doctor, date=day)
        .exclude(status=Appointment.Status.CANCELLED)
        .values_list("start_time", flat=True)
    )
    slots = [t for t in generate_slots(doctor) if t not in booked]
    now = timezone.localtime()
    if day < now.date():
        return []
    if day == now.date():
        slots = [t for t in slots if t > now.time()]
    return [t.strftime("%H:%M") for t in slots]
