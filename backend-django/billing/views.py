from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import ADMIN, PATIENT, RECEPTIONIST, RoleMapMixin

from .models import Bill
from .serializers import BillSerializer

VIEWERS = [ADMIN, RECEPTIONIST, PATIENT]
STAFF = [ADMIN, RECEPTIONIST]


class BillViewSet(RoleMapMixin, viewsets.ModelViewSet):
    serializer_class = BillSerializer
    search_fields = ["patient__full_name", "description"]
    ordering = ["-created_at"]
    role_map = {
        "list": VIEWERS, "retrieve": VIEWERS,
        "create": STAFF, "update": STAFF, "partial_update": STAFF,
        "destroy": [ADMIN],
        "pay": VIEWERS,
    }

    def get_queryset(self):
        qs = Bill.objects.select_related("patient")
        if self.request.user.role == PATIENT:
            qs = qs.filter(patient__user=self.request.user)
        status = self.request.query_params.get("status", "").upper()
        if status in Bill.Status.values:
            qs = qs.filter(status=status)
        return qs

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        bill = self.get_object()
        method = str(request.data.get("payment_method", "")).upper()
        if method not in Bill.Method.values:
            return Response({"payment_method": f"Choose one of {', '.join(Bill.Method.values)}."}, status=400)
        if bill.status == Bill.Status.PAID:
            return Response({"detail": "This bill is already paid."}, status=400)
        bill.status = Bill.Status.PAID
        bill.payment_method = method
        bill.paid_at = timezone.now()
        bill.save(update_fields=["status", "payment_method", "paid_at"])
        return Response(self.get_serializer(bill).data)
