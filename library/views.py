from django.contrib import messages
from django.core.exceptions import ValidationError
from django.core.paginator import Paginator
from django.db.models import Q
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from accounts.models import User
from core.access import role_required, student_profile

from .forms import BookForm, CategoryForm, IssueForm
from .models import BookCategory, BookIssue, LibraryBook
from .services import issue_book, return_book


@role_required("ADMIN", "STUDENT")
def books(request):
    qs = LibraryBook.objects.select_related("category")
    q = request.GET.get("q", "").strip()
    if q:
        qs = qs.filter(Q(title__icontains=q) | Q(author__icontains=q) | Q(isbn__icontains=q))
    if request.GET.get("category"):
        qs = qs.filter(category_id=request.GET["category"])
    mine = []
    if request.user.role == User.Role.STUDENT:
        profile = student_profile(request.user)
        mine = BookIssue.objects.filter(student=profile).select_related("book")
    return render(
        request,
        "library/books.html",
        {
            "page_obj": Paginator(qs, 12).get_page(request.GET.get("page")),
            "categories": BookCategory.objects.all(),
            "mine": mine,
            "q": q,
        },
    )


@role_required("ADMIN")
def book_create(request):
    form = BookForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Book saved.")
        return redirect("library:books")
    return render(request, "library/book_form.html", {"form": form, "page_title": "New book"})


@role_required("ADMIN")
def book_edit(request, pk):
    book = get_object_or_404(LibraryBook, pk=pk)
    form = BookForm(request.POST or None, instance=book)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Book updated.")
        return redirect("library:books")
    return render(request, "library/book_form.html", {"form": form, "page_title": "Edit book"})


@role_required("ADMIN")
def category_create(request):
    form = CategoryForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        form.save()
        messages.success(request, "Category saved.")
        return redirect("library:books")
    return render(request, "library/book_form.html", {"form": form, "page_title": "New category"})


@role_required("ADMIN")
def issues(request):
    form = IssueForm(request.POST or None)
    if request.method == "POST" and form.is_valid():
        try:
            issue_book(actor=request.user, **form.cleaned_data)
            messages.success(request, "Book issued.")
            return redirect("library:issues")
        except ValidationError as exc:
            messages.error(request, " ".join(exc.messages))
    open_issues = BookIssue.objects.filter(returned_on__isnull=True).select_related("book", "student__user")
    return render(request, "library/issues.html", {"form": form, "issues": open_issues, "today": timezone.localdate()})


@role_required("ADMIN")
def do_return(request, pk):
    issue = get_object_or_404(BookIssue, pk=pk)
    if request.method == "POST":
        try:
            return_book(issue=issue, actor=request.user)
            messages.success(request, "Book returned.")
        except ValidationError as exc:
            messages.error(request, " ".join(exc.messages))
    return redirect("library:issues")
