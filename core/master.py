from django.contrib import messages
from django.db.models import ProtectedError, Q
from django.shortcuts import get_object_or_404, redirect
from django.urls import reverse
from django.views.generic import CreateView, ListView, UpdateView, View

from core.access import RoleRequiredMixin


class MasterListView(RoleRequiredMixin, ListView):
    template_name = "core/master_list.html"
    paginate_by = 12
    page_title = ""
    page_subtitle = ""
    headers = []
    columns = []
    search_fields = []
    create_url_name = ""
    edit_url_name = ""
    delete_url_name = ""
    open_url_name = ""
    open_label = "Open"
    allowed_roles = ("ADMIN",)
    select_related_fields = ()

    def get_queryset(self):
        qs = super().get_queryset()
        if self.select_related_fields:
            qs = qs.select_related(*self.select_related_fields)
        q = self.request.GET.get("q", "").strip()
        if q and self.search_fields:
            query = Q()
            for field in self.search_fields:
                query |= Q(**{f"{field}__icontains": q})
            qs = qs.filter(query)
        return qs

    def _cell(self, obj, column):
        if callable(column):
            return column(obj)
        value = obj
        for part in column.split("."):
            value = getattr(value, part)
            if callable(value):
                value = value()
        return value

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        rows = []
        for obj in ctx["object_list"]:
            rows.append(
                {
                    "cells": [self._cell(obj, column) for column in self.columns],
                    "edit_url": reverse(self.edit_url_name, args=[obj.pk]) if self.edit_url_name else "",
                    "delete_url": reverse(self.delete_url_name, args=[obj.pk]) if self.delete_url_name else "",
                    "open_url": reverse(self.open_url_name, args=[obj.pk]) if self.open_url_name else "",
                }
            )
        ctx.update(
            {
                "rows": rows,
                "headers": self.headers,
                "page_title": self.page_title,
                "page_subtitle": self.page_subtitle,
                "create_url": reverse(self.create_url_name) if self.create_url_name else "",
                "open_label": self.open_label,
            }
        )
        return ctx


class MasterCreateView(RoleRequiredMixin, CreateView):
    template_name = "core/master_form.html"
    page_title = ""
    allowed_roles = ("ADMIN",)
    success_url_name = ""

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["page_title"] = self.page_title
        return ctx

    def form_valid(self, form):
        messages.success(self.request, "Saved.")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse(self.success_url_name)


class MasterUpdateView(RoleRequiredMixin, UpdateView):
    template_name = "core/master_form.html"
    page_title = ""
    allowed_roles = ("ADMIN",)
    success_url_name = ""

    def get_context_data(self, **kwargs):
        ctx = super().get_context_data(**kwargs)
        ctx["page_title"] = self.page_title
        return ctx

    def form_valid(self, form):
        messages.success(self.request, "Updated.")
        return super().form_valid(form)

    def get_success_url(self):
        return reverse(self.success_url_name)


class MasterDeleteView(RoleRequiredMixin, View):
    model = None
    allowed_roles = ("ADMIN",)
    success_url_name = ""

    def post(self, request, pk):
        obj = get_object_or_404(self.model, pk=pk)
        try:
            obj.delete()
            messages.success(request, "Deleted.")
        except ProtectedError:
            messages.error(request, "That record is in use and was kept.")
        return redirect(self.success_url_name)
